import { Asset, Transaction } from '@models/index';

export const assets: Partial<Asset>[] = [
  {
    assetId: '0x000000000000000000000000000000000000000000000000000000',
    amount: '0.1',
    to: 'kajsakhksdhasda',
    utxo: 'utxo',
    onPredicate: 'onPredicate',
  },
  {
    assetId: '0x000000000000000000000000000000000000000000000000000000',
    amount: '0.13',
    to: 'kajsakhksdhasda',
    utxo: 'utxo',
    onPredicate: 'onPredicate',
  },
  {
    assetId: '0x000000000000000000000000000000000000000000000000000000',
    amount: '0.15',
    to: 'kajsakhksdhasda',
    utxo: 'utxo',
    onPredicate: 'onPredicate',
  },
];


export default async function () {
  const existingAssets = await Asset.find({
    where: [{ assetId: assets[0].assetId }, { to: assets[0].to }],
  });

  if (existingAssets.length) return;

  const transactions = await Transaction.find();
  const transaction_id = transactions[0].id;

  for await (const asset of assets) {
    await Asset.create({
      ...asset,
      transactionID: transaction_id,
    }).save();
  }
}
