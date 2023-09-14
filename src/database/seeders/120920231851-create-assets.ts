import { Asset } from '@models/index';

export default async function () {
  const assets: Partial<Asset>[] = [
    {
      assetID: '0x000000000000000000000000000000000000000000000000000000',
      amount: 0.1,
      to: 'kajsakhksdhasda',
      transactionID: 'F4082213-EB62-4D8C-B81F-3C71BE7FE7B2',
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
