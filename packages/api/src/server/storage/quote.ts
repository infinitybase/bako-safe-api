import {
  RedisReadClient,
  RedisWriteClient,
  IAsset,
  IAssetMapById,
  getAssetsMaps,
  isDevMode,
} from '@src/utils';
import axios from 'axios';

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

  private async addQuotes(): Promise<void> {
    const { assets, assetsMapById, QuotesMock } = await getAssetsMaps();
    if (isDevMode) {
      await this.addMockQuotes(QuotesMock);
      return;
    }

    const _assets = this.generateAssets(assets);
    const params = this.generateParams(assetsMapById, assets);

    if (params) {
      const quotes = await this.fetchQuotes(_assets, params);
      await this.setQuotes(quotes);
    }
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

      console.log('[REDIS] QUOTE STARTED');
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
