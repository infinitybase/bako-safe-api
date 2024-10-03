import { BN, CoinQuantity, OutputCoin, TransactionRequestOutput, bn } from 'fuels';

import app from '@src/server/app';
import { Transaction } from '@src/models';
import { isOutputCoin } from './outputTypeValidate';
import { getAssetsMaps } from './assets';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

const calculateReservedCoins = (transactions: Transaction[]): CoinQuantity[] => {
  const reservedMap = new Map<string, BN>();

  transactions.forEach(transaction => {
    const { outputs } = transaction.txData;

    outputs
      .filter((output: TransactionRequestOutput) => isOutputCoin(output))
      .forEach((output: OutputCoin) => {
        const { assetId, amount } = output;
        const currentAmount = reservedMap.get(assetId) || new BN(0);
        reservedMap.set(assetId, currentAmount.add(amount));
      });
  });

  const result = Array.from(reservedMap, ([assetId, amount]) => ({
    assetId,
    amount,
  }));

  return result;
};

const calculateBalanceUSD = async (
  balances: CoinQuantity[],
  chainId: number = Number(FUEL_PROVIDER_CHAIN_ID),
): Promise<string> => {
  let balanceUSD = 0;
  const { fuelUnitAssets } = await getAssetsMaps();

  console.log('chainId:', chainId);

  balances?.forEach(balance => {
    const units = fuelUnitAssets(chainId, balance.assetId);
    const formattedAmount = balance.amount
      .format({
        units,
      })
      .slice(0, 5);

    const priceUSD = app._quoteCache.getQuote(balance.assetId);
    balanceUSD += parseFloat(formattedAmount) * priceUSD;
  });

  return balanceUSD.toFixed(2);
};

const subCoins = (
  balances: CoinQuantity[],
  reservedCoins: CoinQuantity[],
): CoinQuantity[] => {
  const reservedMap = new Map(
    reservedCoins.map(coin => [coin.assetId, coin.amount]),
  );

  return balances
    .map(balance => {
      const reservedAmount = reservedMap.get(balance.assetId);
      const adjustedAmount = reservedAmount
        ? balance.amount.sub(reservedAmount)
        : balance.amount;
      return { ...balance, amount: adjustedAmount };
    })
    .filter(balance => balance.amount.gt(bn.parseUnits('0')));
};

export { calculateReservedCoins, calculateBalanceUSD, subCoins };
