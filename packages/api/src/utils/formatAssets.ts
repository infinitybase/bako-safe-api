import { bn, OutputCoin, TransactionRequestOutput } from 'fuels';
import { isOutputCoin } from './outputTypeValidate';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

const formatAssets = (
  outputs: TransactionRequestOutput[],
  to?: string,
) => {
  const assets = outputs
    .filter((output: TransactionRequestOutput) => isOutputCoin(output))
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

export { formatAssets };
