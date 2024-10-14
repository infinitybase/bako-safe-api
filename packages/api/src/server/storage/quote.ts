import { IAsset, IAssetMapById, getAssetsMaps, isDevMode } from '@src/utils';
import axios from 'axios';

const { COIN_MARKET_CAP_API_KEY } = process.env;

export interface IQuote {
  assetId: string;
  price: number;
}

const REFRESH_TIME = 1000 * 60 * 25; // 25 minutes

export class QuoteStorage {
  private data = new Map<string, number>();

  protected constructor() {
    this.data = new Map<string, number>();
  }

  public getQuote(assetId: string): number {
    const quote = this.data.get(assetId);
    return quote ?? 0;
  }

  private setQuote(assetId: string, price: number): void {
    this.data.set(assetId, price);
  }

  private async addMockQuotes(QuotesMock: IQuote[]): Promise<void> {
    QuotesMock &&
      QuotesMock.forEach(quote => {
        this.setQuote(quote.assetId, quote.price);
      });
  }

  private async addQuotes(): Promise<void> {
    const { assets, assetsMapById, QuotesMock } = await getAssetsMaps();
    if (isDevMode) {
      this.addMockQuotes(QuotesMock);
      return;
    }

    const params = this.generateParams(assetsMapById, assets);

    if (params) {
      const quotes = await this.fetchQuotes(assets, params);
      quotes.forEach(quote => {
        this.setQuote(quote.assetId, quote.price);
      });
    }
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
    const whitelist = {
      usdc: 'usd-coin',
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
    };

    return whitelist[name] ?? name;
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

  public getActiveQuotes() {
    return Array.from(this.data).length;
  }

  public getActiveQuotesValues() {
    return Array.from(this.data);
  }

  static start() {
    const _this = new QuoteStorage();
    _this.addQuotes();

    setInterval(() => {
      _this.addQuotes();
    }, REFRESH_TIME);

    return _this;
  }
}
