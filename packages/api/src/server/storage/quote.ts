import {
  RedisReadClient,
  RedisWriteClient,
  IAsset,
  IAssetMapById,
  getAssetsMaps,
  isDevMode,
} from '@src/utils';
import { tokensIDS } from '@src/utils/assets-token/addresses';
import { logger } from '@src/config/logger';
import axios from 'axios';
import App from '../app';

const { COIN_MARKET_CAP_API_KEY } = process.env;

const PREFIX = 'quotes';
const REFRESH_TIME = 60000 * 25; // 25 minutes

export interface IQuote {
  assetId: string;
  price: number;
}

export class QuoteStorage {
  private static instance?: QuoteStorage;
  private static intervalRef?: NodeJS.Timeout;

  protected constructor() {}

  public async getQuote(assetId: string): Promise<number> {
    const quote = await RedisReadClient.get(`${PREFIX}-${assetId}`);
    return Number(quote) ?? 0;
  }

  private async setQuotes(quotes: IQuote[]) {
    await RedisWriteClient.hsetMany(
      PREFIX,
      quotes.map(quote => ({ field: quote.assetId, value: quote.price })),
    );
  }

  private async addMockQuotes(QuotesMock: IQuote[]): Promise<void> {
    await this.setQuotes(QuotesMock);
  }

  /**
   * Calcula o preço do stFUEL baseado no preço do FUEL e no ratio do Rig
   * stFUEL é um token de staking líquido que representa FUEL em stake
   * Formula: preço_stFUEL = preço_FUEL * ratio
   * Ex: Se FUEL = $2 e ratio = 1.05, então stFUEL = $2 * 1.05 = $2.10
   */
  private async calculateStFUELPrice(quotes: IQuote[]): Promise<number> {
    const rigCache = App.getInstance()._rigCache;
    if (!rigCache) {
      // RIG not configured, skip stFUEL quote calculation
      return 0;
    }

    const DECIMALS = 10 ** 9;
    const fuelQuote = quotes.find(q => q.assetId === tokensIDS.FUEL);

    if (!fuelQuote) {
      logger.warn('FUEL quote not found, cannot calculate stFUEL price');
      return 0;
    }

    try {
      const rigInstance = await rigCache;
      const ratio = (await rigInstance.getRatio()) / DECIMALS;
      // stFUEL vale MAIS que FUEL devido ao acúmulo de recompensas
      return fuelQuote.price * ratio;
    } catch (error) {
      logger.error({ error }, 'Error calculating stFUEL price:');
      return 0;
    }
  }

  /**
   * Adiciona tokens derivados (como stFUEL) aos quotes base
   * Facilita adicionar outros tokens derivados no futuro (ex: wstETH, rETH)
   */
  private async enrichWithDerivedTokens(quotes: IQuote[]): Promise<IQuote[]> {
    const enriched = [...quotes];

    // Adiciona stFUEL calculado dinamicamente
    const stFuelPrice = await this.calculateStFUELPrice(quotes);
    enriched.push({
      assetId: tokensIDS.stFUEL,
      price: stFuelPrice,
    });

    return enriched;
  }

  private async addQuotes(): Promise<void> {
    const { assets, assetsMapById, QuotesMock } = await getAssetsMaps();

    let baseQuotes: IQuote[];

    if (isDevMode) {
      baseQuotes = QuotesMock;
    } else {
      const _assets = this.generateAssets(assets);
      const params = this.generateParams(assetsMapById, assets);
      baseQuotes = params ? await this.fetchQuotes(_assets, params) : [];
    }

    // Adiciona tokens derivados (stFUEL, etc)
    const allQuotes = await this.enrichWithDerivedTokens(baseQuotes);

    // Salva todos os quotes no Redis
    await this.setQuotes(allQuotes);
  }

  private generateAssets(assets: IAsset[]) {
    return assets.map(asset => ({
      id: asset.id,
      symbol: this.parseName(asset.symbol),
    }));
  }

  private generateParams(assetsMapById: IAssetMapById, assets?: IAsset[]): string {
    if (!assets) return '';

    return assets.reduce((acc, asset) => {
      const _asset = assetsMapById[asset.id];
      if (_asset && _asset.slug) {
        acc += (acc ? ',' : '') + this.parseName(_asset.slug);
      }
      return acc;
    }, '');
  }

  private parseName(name: string) {
    const _name = name.toLowerCase();

    const fromTo = {
      usdc: 'usd-coin',
      usdf: 'usd-coin',
      weeth: 'bridged-weeth-linea',
      wbeth: 'wrapped-beacon-eth',
      'manta mbtc': 'manta-mbtc',
      'manta meth': 'manta-meth',
      'manta musd': 'manta-musd',
      solvbtc: 'solv-btc',
      'solvbtc.bbn': 'solv-protocol-solvbtc-bbn',
      susde: 'ethena-staked-usde',
      wsteth: 'wrapped-steth',
      pzeth: 'renzo-restaked-lst',
      steaklrt: 'steakhouse-resteaking-vault',
      'mantle meth': 'mantle-staked-ether',
      ezeth: 'renzo-restaked-eth',
      usdt: 'tether',
      sdai: 'savings-dai',
      fbtc: 'ignition-fbtc',
      rseth: 'kelp-dao-restaked-eth',
      fuel: 'fuel-network',
    };

    return fromTo[_name] ?? _name;
  }

  private async fetchQuotes(assets: IAsset[], params: string): Promise<IQuote[]> {
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd`,
        {
          params: { ids: params },
          headers: { 'x-cg-demo-api-key': COIN_MARKET_CAP_API_KEY },
        },
      );

      return assets.map(({ id, symbol }) => ({
        assetId: id,
        price: data[symbol]?.usd ?? 0.0,
      }));
    } catch (e) {
      return [];
    }
  }

  public async getActiveQuotesValues(): Promise<[string, number][]> {
    const result = await RedisReadClient.hGetAll(PREFIX);
    return Object.entries(result).map(([k, v]) => [k, Number(v)]);
  }

  public async getActiveQuotes(): Promise<Record<string, number>> {
    const result = await RedisReadClient.hGetAll(PREFIX);
    return Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k, Number(v)]),
    );
  }

  static start(): QuoteStorage {
    if (!QuoteStorage.instance) {
      QuoteStorage.instance = new QuoteStorage();
      QuoteStorage.instance.addQuotes();

      QuoteStorage.intervalRef = setInterval(() => {
        QuoteStorage.instance?.addQuotes();
      }, REFRESH_TIME);
    }

    return QuoteStorage.instance;
  }

  static stop(): void {
    if (QuoteStorage.intervalRef) {
      clearInterval(QuoteStorage.intervalRef);
      QuoteStorage.intervalRef = undefined;
    }
  }
}
