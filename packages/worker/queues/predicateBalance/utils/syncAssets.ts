import type { Collection, WithId } from "mongodb";
import type { SchemaPredicateBalance, SchemaFuelAssets } from "../../../utils/mongo";

export async function syncAssets(deposits: SchemaPredicateBalance[], assets_collection: Collection<SchemaFuelAssets>): Promise<WithId<SchemaFuelAssets>[]> {
    const uniqueAssetIds = [...new Set(deposits.map(d => d.assetId))];
    let assets = await assets_collection.find(
        { _id: { $in: uniqueAssetIds } }
    )?.toArray();
    const assetIds = assets.map(a => a._id);
    const missingAssets = [...new Set(deposits.filter(d => !assetIds.includes(d.assetId)).map(d => d.assetId))];

    for await (const missAsset of missingAssets) {
        const asset = await fetch(`https://mainnet-explorer.fuel.network/assets/${missAsset}`);
        const assetData = await asset.json();
        const isNFT = assetData?.isNFT ?? false;
        const newAsset: SchemaFuelAssets = {
            _id: assetData?.asset_id ?? missAsset,
            name: assetData.name ?? assetData?.metadata?.name ?? '',
            icon: assetData.icon ?? assetData?.metadata?.URI ?? '',
            symbol: assetData.symbol,
            decimals: assetData?.decimals ?? (isNFT ? 1 : 9),
            verified: assetData?.verified ?? false,
            isNFT,
        };
        if (!assets.some(a => a._id === newAsset._id)) {
            await assets_collection.updateOne(
                { _id: newAsset._id },
                { $setOnInsert: newAsset },
                { upsert: true }
            );
            assets = [...assets, newAsset];
        }
    }
    return assets;
}