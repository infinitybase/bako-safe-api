import { OutputCoin, OutputType, TransactionRequestOutput } from 'fuels';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

const formatAssets = (outputs: TransactionRequestOutput[], to?: string) => {
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

export { formatAssets };
