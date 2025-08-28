import { BN, CoinQuantity, OutputCoin, TransactionRequestOutput, bn } from 'fuels';

import App from '@src/server/app';
import { Transaction } from '@src/models';
import { isOutputCoin } from './outputTypeValidate';
import { getAssetsMaps } from './assets';
import { tokensIDS } from './assets-token/addresses';

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

  const quotes = await App.getInstance()._quoteCache.getActiveQuotes();

  for (const balance of balances ?? []) {
    let priceUSD = 0;

    const units = fuelUnitAssets(chainId, balance.assetId);
    const formattedAmount = balance.amount
      .format({
        units,
      })
      .replace(/,/g, '');

    if (balance.assetId === tokensIDS.stFUEL) {
      priceUSD = quotes[tokensIDS.FUEL];

      const amountFuel = await convertStFuelToFuel(formattedAmount);

      balanceUSD += amountFuel * priceUSD;
      continue;
    }

    if (quotes[balance.assetId]) {
      priceUSD = quotes[balance.assetId];
    }

    balanceUSD += parseFloat(formattedAmount) * priceUSD;
  }

  return balanceUSD.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

const convertStFuelToFuel = async (balance: string): Promise<number> => {
  const DECIMALS = 10 ** 9;
  const rigInstance = await App.getInstance()._rigCache;
  const price = (await rigInstance.getRatio()) / DECIMALS;
  const totalStFuelToken = Number(balance || '0');

  return totalStFuelToken / price;
};

export { calculateReservedCoins, calculateBalanceUSD, subCoins };
