import { CoinQuantity, bn } from 'fuels';
import { assets } from '@src/mocks/assets';

import axios from 'axios';

const getPriceUSD = async (assetSlug: string): Promise<number> => {
  try {
    const convert = `${assetSlug}-USD`;
    const { data } = await axios.get(
      `https://economia.awesomeapi.com.br/last/${convert}`,
    );

    return data[convert.replace('-', '')].bid ?? 0.0;
  } catch (e) {
    console.log('[GET_ASSET_PRICE_USD_ERROR]: ', e);
    return 0.0;
  }
};

const getAssetSlugByAssetId = (assetId: string): string | undefined => {
  return Object.keys(assets).find(key => assets[key] === assetId);
};

const calculateBalanceUSD = async (balances: CoinQuantity[]): Promise<string> => {
  let balanceUSD = 0.0;

  for await (const balance of balances) {
    const assetSlug = getAssetSlugByAssetId(balance.assetId);

    if (assetSlug) {
      const formattedAmount = parseFloat(balance.amount.format());
      const priceUSD = await getPriceUSD(assetSlug);
      balanceUSD += formattedAmount * priceUSD;
    }
  }

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
  getPriceUSD,
  getAssetSlugByAssetId,
  calculateBalanceUSD,
  subtractReservedCoinsFromBalances,
};
