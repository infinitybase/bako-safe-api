import { bn, OutputCoin, TransactionRequestOutput } from 'fuels';
import { isOutputCoin } from './outputTypeValidate';
import { isDevMode } from '@src/utils';

const formatAssets = (
  outputs: TransactionRequestOutput[],
  to?: string,
  fuelUnitAssets?: (chainId: number, assetId: string) => number,
) => {
  const assets = outputs
    .filter((output: TransactionRequestOutput) => isOutputCoin(output))
    .filter((output: OutputCoin) => (to ? output.to === to : true))
    .map((output: OutputCoin) => {
      const { assetId, amount, to } = output;

      const units = fuelUnitAssets
        ? fuelUnitAssets(isDevMode ? 0 : 9889, assetId)
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
