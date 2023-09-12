import { Asset } from '@models/index';

export default async function () {
  const assets: Partial<Asset>[] = [
    {
      assetID: '0x000000000000000000000000000000000000000000000000000000',
      amount: 0.1,
      to: 'kajsakhksdhasda',
      transactionID: 1,
    },
  ];

  const existingAssets = await Asset.find({
    where: [{ assetID: assets[0].assetID }, { to: assets[0].to }],
  });

  if (existingAssets.length) return;

  for await (const asset of assets) {
    await Asset.create(asset).save();
  }
}
