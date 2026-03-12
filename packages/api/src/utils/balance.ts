import { BN, CoinQuantity, OutputCoin, TransactionRequestOutput, bn } from 'fuels';

import App from '@src/server/app';
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

  const quotes = await App.getInstance()._quoteCache.getActiveQuotes();

  for (const balance of balances ?? []) {
    const units = fuelUnitAssets(chainId, balance.assetId);
    const formattedAmount = balance.amount
      .format({
        units,
      })
      .replace(/,/g, '');

    const priceUSD = quotes[balance.assetId] ?? 0;
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

/**
 * Compare two arrays of CoinQuantity to detect balance changes
 * @param cached - Previously cached balances
 * @param current - Current balances from blockchain
 * @returns true if balances are different, false if identical
 */
const compareBalances = (
  cached: CoinQuantity[],
  current: CoinQuantity[],
): boolean => {
  if (cached.length !== current.length) {
    return true;
  }

  // Sort by assetId for comparison
  const sortFn = (a: CoinQuantity, b: CoinQuantity) =>
    a.assetId.localeCompare(b.assetId);
  const cachedSorted = [...cached].sort(sortFn);
  const currentSorted = [...current].sort(sortFn);

  for (let i = 0; i < cachedSorted.length; i++) {
    const cachedAsset = cachedSorted[i];
    const currentAsset = currentSorted[i];

    if (
      cachedAsset.assetId !== currentAsset.assetId ||
      !cachedAsset.amount.eq(currentAsset.amount)
    ) {
      return true;
    }
  }

  return false;
};

export { calculateReservedCoins, calculateBalanceUSD, subCoins, compareBalances };
