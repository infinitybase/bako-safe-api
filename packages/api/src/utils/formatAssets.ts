import { bn, OutputCoin, TransactionRequestOutput } from 'fuels';
import { isOutputCoin } from './outputTypeValidate';

const formatAssets = (outputs: TransactionRequestOutput[]) => {
  const assets = outputs
    .filter((output: TransactionRequestOutput) => isOutputCoin(output))
    .map((output: OutputCoin) => {
      const { assetId, amount, to } = output;
      return {
        assetId,
        amount: bn(amount).format(),
        to,
      };
    });

  return assets;
};

export { formatAssets };
