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

const subCoins = (
  balances: CoinQuantity[],
  reservedCoins: CoinQuantity[],
): CoinQuantity[] => {
  const reservedMap = new Map(reservedCoins.map(coin => [coin.assetId, coin.amount]));

  return balances
    .map(balance => {
      const reservedAmount = reservedMap.get(balance.assetId);
      const adjustedAmount = reservedAmount ? balance.amount.sub(reservedAmount) : balance.amount;
      return { ...balance, amount: adjustedAmount };
    })
    .filter(balance => balance.amount.gt(bn.parseUnits('0')));
};

export { calculateBalanceUSD, subCoins };
