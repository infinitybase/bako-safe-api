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

export interface IQuote {
  assetId: string;
  price: number;
}

const REFRESH_TIME = 60000 * 25; // 25 minutes

export class QuoteStorage {
  protected constructor() {}

  public async getQuote(assetId: string): Promise<number> {
    const quote = await RedisReadClient.get(`${PREFIX}-${assetId}`);
    return Number(quote) ?? 0;
  }

  private async setQuote(assetId: string, price: number) {
    await RedisWriteClient.set(`${PREFIX}-${assetId}`, price);
  }

  private async addMockQuotes(QuotesMock: IQuote[]): Promise<void> {
    // biome-ignore lint/complexity/noForEach: <explanation>
    QuotesMock.forEach(async quote => {
      await this.setQuote(quote.assetId, quote.price);
    });
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
      await Promise.all(
        quotes.map(quote => this.setQuote(quote.assetId, quote.price)),
      );
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

    const params = assets.reduce((acc, asset) => {
      const _asset = assetsMapById[asset.id];

      if (_asset && _asset.slug) {
        acc += (acc ? ',' : '') + this.parseName(_asset.slug);
      }

      return acc;
    }, '');

    return params;
  }

  private parseName(name: string) {
    const _name = name.toLowerCase();

    const fromTo = {
      usdc: 'usd-coin',
      usdf: 'usd-coin', // usdf -> token fuel fluid
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
    };

    return fromTo[_name] ?? _name;
  }

  private async fetchQuotes(assets: IAsset[], params: string): Promise<IQuote[]> {
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd`,
        {
          params: {
            ids: params,
          },
          headers: { 'x-cg-demo-api-key': COIN_MARKET_CAP_API_KEY },
        },
      );

      const aux = Object.entries(assets).map(([key, value]) => {
        return {
          assetId: value.id,
          price: data[value.symbol]?.usd ?? 0.0,
        };
      });

      return aux;
    } catch (e) {
      return [];
    }
  }

  public async getActiveQuotesValues(): Promise<[string, number][]> {
    const result = await RedisReadClient.scan(`${PREFIX}-*`);
    const quotes = new Map<string, number>();

    result.forEach((value, key) => {
      quotes.set(key.replace(`${PREFIX}-`, ''), Number(value));
    });

    const res = quotes.size > 0 ? Array.from(quotes) : [];

    return Array.from(res);
  }

  public async getActiveQuotes(): Promise<Record<string, number>> {
    const result = await RedisReadClient.scan(`${PREFIX}-*`);
    const quotes = {};

    result.forEach((value, key) => {
      quotes[key.replace(`${PREFIX}-`, '')] = Number(value);
    });

    return quotes;
  }

  static start() {
    const _this = new QuoteStorage();
    _this.addQuotes();

    setInterval(() => {
      _this.addQuotes();
    }, REFRESH_TIME);

    console.log('[REDIS] QUOTE STARTED');

    return _this;
  }
}
