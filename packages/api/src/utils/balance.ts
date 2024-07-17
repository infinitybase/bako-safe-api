import { CoinQuantity, bn } from 'fuels';

import app from '@src/server/app';
import { Asset } from 'bakosafe';
import { assetsMap } from './assets';

const calculateBalanceUSD = (balances: CoinQuantity[]): string => {
  let balanceUSD = 0;

  balances.forEach(balance => {
    const formattedAmount = parseFloat(balance.amount.format());
    const priceUSD = app._quoteCache.getQuote(balance.assetId);
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

const balancesToAssets = (
  balances: CoinQuantity[],
  reservedCoins: CoinQuantity[],
) => {
  return balances.reduce((acc, balance) => {
    const assetInfos = assetsMap[balance.assetId];
    const reservedCoinAmount = reservedCoins?.find(
      item => item.assetId === balance.assetId,
    )?.amount;
    const adjustedAmount = reservedCoinAmount
      ? balance.amount.sub(reservedCoinAmount)
      : balance.amount;

    if (adjustedAmount.gt(0)) {
      acc.push({
        amount: adjustedAmount.format(),
        slug: assetInfos?.slug ?? 'UKN',
        name: assetInfos?.name ?? 'Unknown',
        assetId: balance.assetId,
      });
    }

    return acc;
  }, [] as Required<Asset>[]);
};

export { calculateBalanceUSD, subtractReservedCoinsFromBalances, balancesToAssets };
