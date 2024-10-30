import { IQuote } from '@src/server/storage';
import { getAssetsMaps, RedisReadClient } from '@src/utils';

const PREFIX = 'quotes';

export class QuoteService {
  async fetchAllFromRedis(): Promise<IQuote[]> {
    const { fuelAssetsList, assetsMapById } = await getAssetsMaps();
    const result = await RedisReadClient.scan(`${PREFIX}-*`);
    const quotes = [];

    result.forEach((value, key) => {
      const assetId = key.replace(`${PREFIX}-`, '');
      const asset = fuelAssetsList.find(
        a => a.name === assetsMapById[assetId]?.symbol,
      );

      quotes.push({
        assetId: assetId,
        price: Number(value),
        symbol: asset?.symbol || assetsMapById[assetId]?.symbol,
        symbolSlug:
          asset?.symbol.toLowerCase() ||
          assetsMapById[assetId]?.symbol.toLowerCase(),
      });
    });

    return quotes;
  }
}
