import { bn } from "fuels";
import type { Collection, WithId } from "mongodb";
import type { SchemaPredicateBalance, SchemaFuelAssets } from "../../../utils/mongo";

export async function syncBalance(
    deposits: SchemaPredicateBalance[], 
    balance_collection: Collection<SchemaPredicateBalance>, 
    assets: WithId<SchemaFuelAssets>[],
    assets_collection: Collection<SchemaFuelAssets>
): Promise<void> {
    try{
        if (deposits.length > 0) {
            const balances = await assets_collection.find({
                _id: { $in: assets.map(a => a._id) },
            }).toArray();

            const balancesMap = balances.reduce((acc, balance) => {
            acc[balance._id] = balance.usdValue ?? 0.0;
            return acc;
            }, {});
    
            for await (const deposit of deposits) {
                const usdcPrice = balancesMap[deposit.assetId] ?? 0.0;
                const units = assets.find(a => a._id === deposit.assetId)?.decimals ?? 9;
                
                const depositPriceUsd = bn(deposit.amount).format({
                    units,
                }).replace(/,/g, '');
    
                const value = Number(depositPriceUsd) * usdcPrice * (deposit.isDeposit ? 1 : -1);
                const verifiedToken = assets.find(a => a._id === deposit.assetId)?.verified ?? false
                await balance_collection.insertOne({
                    ...deposit,
                    usdValue: verifiedToken ? Number(value.toFixed(12)) : 0.0,
                    verifiedToken: verifiedToken,
                    formatedAmount: verifiedToken ? Number(deposit.isDeposit ? depositPriceUsd : `-${depositPriceUsd}`) : 0.0,
                })
            }
        }
    }catch(e){
        console.error(e);
        throw e;
    }
}