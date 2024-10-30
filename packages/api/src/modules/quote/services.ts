import { IQuote } from '@src/server/storage';
import { getAssetsMaps, RedisReadClient } from '@src/utils';

const PREFIX = 'quotes';

export class QuoteService {
  async fetchAllFromRedis(): Promise<IQuote[]> {
    const { assetsMapById } = await getAssetsMaps();
    const result = await RedisReadClient.scan(`${PREFIX}-*`);
    const quotes = [];

    result.forEach((value, key) => {
      const assetId = key.replace(`${PREFIX}-`, '');
      quotes.push({
        assetId: assetId,
        price: Number(value),
        symbol: assetsMapById[assetId]?.symbol,
        symbolSlug: assetsMapById[assetId]?.symbol.toLowerCase(),
      });
    });

    return quotes;
  }
}
