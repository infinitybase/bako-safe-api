import { CoinQuantity, bn } from 'fuels';

import axios from 'axios';
import { assetsMapById, assetsMapBySymbol } from './assets';

const { COIN_MARKET_CAP_API_KEY } = process.env;

const generateSlugParams = (balances: CoinQuantity[]): string => {
  return balances.reduce((acc, balance) => {
    const asset = assetsMapById[balance.assetId];

    if (asset && asset.slug) {
      acc += (acc ? ',' : '') + asset.slug;
    }

    return acc;
  }, '');
};

const getPriceUSD = async (
  assetSlugs: string,
): Promise<{ [key: string]: number }> => {
  try {
    const { data } = await axios.get(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`,
      {
        params: {
          slug: assetSlugs,
        },
        headers: { 'X-CMC_PRO_API_KEY': COIN_MARKET_CAP_API_KEY },
      },
    );

    const formattedData = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(data.data).forEach((item: any) => {
      formattedData[assetsMapBySymbol[item.symbol].id] = item.quote.USD.price;
    });

    return formattedData;
  } catch (e) {
    console.log('[GET_ASSET_PRICE_USD_ERROR]: ', e);
    return {};
  }
};

const calculateBalanceUSD = async (balances: CoinQuantity[]): Promise<string> => {
  let balanceUSD = 0;
  const assetSlugs = generateSlugParams(balances);
  const assetPrices = await getPriceUSD(assetSlugs);

  balances.forEach(balance => {
    const formattedAmount = parseFloat(balance.amount.format());
    const priceUSD = assetPrices[balance.assetId] ?? 0;
    balanceUSD += formattedAmount * priceUSD;
  });

  return balanceUSD.toFixed(2);
};

const subtractReservedCoinsFromBalances = (
  balances: CoinQuantity[],
  reservedCoins: CoinQuantity[],
): CoinQuantity[] => {
  return balances.reduce((acc, balance) => {
    const reservedCoin = reservedCoins.find(
      coin => coin.assetId === balance.assetId,
    );
    const adjustedAmount = reservedCoin
      ? balance.amount.sub(reservedCoin.amount)
      : balance.amount;

    if (adjustedAmount.gt(bn.parseUnits('0'))) {
      acc.push({ ...balance, amount: adjustedAmount });
    }

    return acc;
  }, [] as CoinQuantity[]);
};

export {
  generateSlugParams,
  getPriceUSD,
  calculateBalanceUSD,
  subtractReservedCoinsFromBalances,
};
