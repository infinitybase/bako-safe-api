import { bn, OutputCoin, TransactionRequestOutput } from 'fuels';
import { isOutputCoin } from './outputTypeValidate';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

const formatAssets = (
  outputs: TransactionRequestOutput[],
  to?: string,
  chaindId?: number,
  fuelUnitAssets?: (chainId: number, assetId: string) => number,
) => {
  const assets = outputs
    .filter((output: TransactionRequestOutput) => isOutputCoin(output))
    .filter((output: OutputCoin) => (to ? output.to === to : true))
    .map((output: OutputCoin) => {
      const { assetId, amount, to } = output;

      const units = fuelUnitAssets
        ? fuelUnitAssets(chaindId ?? Number(FUEL_PROVIDER_CHAIN_ID), assetId)
        : undefined;
      return {
        assetId,
        amount: bn(amount).format({ units }),
        to,
      };
    });

  return assets;
};

export { formatAssets };
