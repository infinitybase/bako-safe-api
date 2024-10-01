import {
  IAsset,
  QuotesMock,
  assets,
  assetsMapById,
  assetsMapBySymbol,
  isDevMode,
} from '@src/utils';
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

  private addMockQuotes(): void {
    QuotesMock &&
      QuotesMock.forEach(quote => {
        this.setQuote(quote.assetId, quote.price);
      });
  }

  private async addQuotes(): Promise<void> {
    if (isDevMode) {
      this.addMockQuotes();
      return;
    }

    const params = this.generateParams(assets);

    if (params) {
      const quotes = await this.fetchQuotes(params);
      // console.log('[PARAMS]', quotes);
      quotes.forEach(quote => {
        this.setQuote(quote.assetId, quote.price);
      });
    }
  }

  private generateParams(assets?: IAsset[]): string {
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
    };

    return whitelist[name] ?? name;
  }

  //   {
  //     "bitcoin": {
  //         "usd": 65083
  //     },
  //     "ethereum": {
  //         "usd": 2651.72
  //     }
  // }

  private async fetchQuotes(params: string): Promise<IQuote[]> {
    try {
      const { data, request } = await axios.get(
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
      // console.log('COINS_PRICE', aux);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // const formattedData = Object.values(data.data).map((item: any) => ({
      //   assetId: assetsMapBySymbol[item.symbol].id,
      //   price: item.quote.USD.price,
      // }));

      return aux;
    } catch (e) {
      // console.log('[STORAGE_QUOTE] Get quots value: ', e.message);
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
