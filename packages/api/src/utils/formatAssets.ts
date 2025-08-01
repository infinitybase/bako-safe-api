import {
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

export { formatAssetFromOperations, formatAssets };
