import { Operation} from 'fuels';

const { FUEL_PROVIDER_CHAIN_ID } = process.env;

const formatAssets = (
  outputs: Operation[],
  to?: string,
) => {
  return outputs
    .find((o) => o.to.address === to)
    .assetsSent.map((asset) => {
      return {
        assetId: asset.assetId,
        amount: asset.amount.toString(),
        to,
      };
    });
};

export { formatAssets };
