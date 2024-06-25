import { CoinQuantity, bn } from 'fuels';

import app from '@src/server/app';

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

export { calculateBalanceUSD, subtractReservedCoinsFromBalances };
