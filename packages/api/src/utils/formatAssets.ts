import { ASSETS, FIAT_CURRENCIES } from '@src/constants/assets';
import { Transaction } from '@src/models';
import {
  bn,
  Operation,
  OperationName,
  OutputCoin,
  OutputType,
  TransactionRequestOutput,
} from 'fuels';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

export type AssetFormat = {
  assetId: string;
  amount: string;
  to: string;
  currency?: string;
};

const formatAssets = (
  outputs: TransactionRequestOutput[],
  to?: string,
): AssetFormat[] => {
  const assets = outputs
    .filter(
      (output: TransactionRequestOutput) =>
        output.type === OutputType.Coin || output.type === OutputType.Variable,
    )
    .filter((output: OutputCoin) => !!output.to && !!output.amount)
    .filter((output: OutputCoin) => (to ? output.to === to : true))
    .map((output: OutputCoin) => {
      const { assetId, amount, to } = output;

      return {
        assetId,
        amount: amount.toString(),
        to,
      };
    });

  return assets;
};

const formatAssetFromOperations = (
  operations: Operation[],
  account: string,
): AssetFormat[] => {
  const mainContractCallOperation = operations.find(
    operation =>
      operation.from.address === account &&
      operation.name === OperationName.contractCall &&
      !!operation.assetsSent,
  );

  if (mainContractCallOperation) {
    return mainContractCallOperation.assetsSent.map(asset => ({
      assetId: asset.assetId,
      amount: asset.amount.toString(),
      to: mainContractCallOperation.to.address,
    }));
  }

  const assets = operations
    .filter(operation => operation.from.address === account)
    .filter(operation => !!operation.assetsSent)
    .flatMap(operation =>
      operation.assetsSent.map(asset => ({
        assetId: asset.assetId,
        amount: asset.amount.toString(),
        to: operation.to.address,
      })),
    );

  return assets;
};

const formatAssetFromRampTransaction = (
  transaction: Transaction,
): AssetFormat[] => {
  if (!transaction.rampTransaction) return [];

  const {
    destinationAmount,
    sourceAmount,
    destinationCurrency,
    sourceCurrency,
    providerData,
  } = transaction.rampTransaction;

  const isOnRamp = destinationCurrency === 'ETH_FUEL';

  return [
    {
      assetId: isOnRamp ? ASSETS.FUEL_ETH : '',
      amount: bn.parseUnits(destinationAmount).toString(),
      to: transaction.predicate.predicateAddress,
      currency: destinationCurrency,
    },
    {
      amount: bn.parseUnits(sourceAmount).toString(),
      assetId: FIAT_CURRENCIES[sourceCurrency] || '',
      to: providerData?.transactionData?.cryptoDetails.sourceWalletAddress || '',
      currency: sourceCurrency,
    },
  ];
};

export { formatAssetFromOperations, formatAssetFromRampTransaction, formatAssets };
