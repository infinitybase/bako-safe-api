import {
  IAsset,
  QuotesMock,
  assets,
  assetsMapById,
  assetsMapBySymbol,
} from '@src/utils';
import axios from 'axios';
const { COIN_MARKET_CAP_API_KEY } = process.env;

export interface IQuote {
  assetId: string;
  price: number;
}

export class QuoteStorage {
  private data = new Map<string, number>();

  constructor() {
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
    const params = this.generateParams(assets);

    if (params) {
      const quotes = await this.fetchQuotes(params);

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
        acc += (acc ? ',' : '') + _asset.slug;
      }

      return acc;
    }, '');

    return params;
  }

  private async fetchQuotes(params: string): Promise<IQuote[]> {
    try {
      const { data } = await axios.get(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`,
        {
          params: {
            slug: params,
          },
          headers: { 'X-CMC_PRO_API_KEY': COIN_MARKET_CAP_API_KEY },
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedData = Object.values(data.data).map((item: any) => ({
        assetId: assetsMapBySymbol[item.symbol].id,
        price: item.quote.USD.price,
      }));

      return formattedData;
    } catch (e) {
      console.log('[GET_ASSET_PRICE_USD_ERROR]: ', e);
      return [];
    }
  }

  public startDev() {
    this.addMockQuotes();
  }

  public start() {
    this.addQuotes();

    const minToRefresh = 10;

    setInterval(() => {
      this.addQuotes();
    }, 1000 * 60 * minToRefresh);
  }
}
