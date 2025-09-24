import { ASSETS, FIAT_CURRENCIES } from '@src/constants/assets';
import { Transaction, TransactionTypeWithRamp } from '@src/models';
import {
  bn,
  BN,
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

export function parseAmount(value: any) {
  if (typeof value === 'string') return value;

  const bn = new BN(0);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  bn.words = [...value.words];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  bn.length = value.length;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  bn.negative = value.negative;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  bn.red = value.red;

  return bn.toHex();
}

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
      amount: parseAmount(asset.amount),
      to: mainContractCallOperation.to.address,
    }));
  }

  const assets = operations
    .filter(operation => operation.from.address === account)
    .filter(operation => !!operation.assetsSent)
    .flatMap(operation =>
      operation.assetsSent.map(asset => ({
        assetId: asset.assetId,
        amount: parseAmount(asset.amount),
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

  const isOnRamp = transaction.type === TransactionTypeWithRamp.ON_RAMP_DEPOSIT;

  // BRL amounts from Meld come with comma as decimal separator
  // We need to replace it with a dot to parse it correctly
  const formattedSourceAmount =
    isOnRamp && sourceCurrency === 'BRL'
      ? sourceAmount.replace(',', '.')
      : sourceAmount;

  const formattedDestinationAmount =
    !isOnRamp && destinationCurrency === 'BRL'
      ? destinationAmount.replace(',', '.')
      : destinationAmount;

  return [
    // source currency
    {
      amount: bn.parseUnits(formattedSourceAmount).toString('hex'),
      assetId: isOnRamp ? FIAT_CURRENCIES[sourceCurrency] || '' : ASSETS.FUEL_ETH,
      to: isOnRamp
        ? providerData?.transactionData?.cryptoDetails.sourceWalletAddress || ''
        : transaction.predicate.predicateAddress,
      currency: sourceCurrency,
    },
    // destination currency
    {
      assetId: isOnRamp
        ? ASSETS.FUEL_ETH
        : FIAT_CURRENCIES[destinationCurrency] || '',
      amount: bn.parseUnits(formattedDestinationAmount).toString('hex'),
      to: isOnRamp
        ? transaction.predicate.predicateAddress
        : providerData?.transactionData?.cryptoDetails.destinationWalletAddress ||
          '',
      currency: destinationCurrency,
    },
  ];
};

export { formatAssetFromOperations, formatAssetFromRampTransaction, formatAssets };
