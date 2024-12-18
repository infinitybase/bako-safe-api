import { bn } from "fuels";
import type { Collection, WithId } from "mongodb";
import type { SchemaPredicateBalance, SchemaFuelAssets } from "../../../utils/mongo";
import { RedisReadClient } from "../../../utils/redis/RedisReadClient";

export async function syncBalance(deposits: SchemaPredicateBalance[], balance_collection: Collection<SchemaPredicateBalance>, assets: WithId<SchemaFuelAssets>[]): Promise<void> {
    if (deposits.length > 0) {
            
        for await (const deposit of deposits) {
            const usdcPrice = await RedisReadClient.getQuote(deposit.assetId); 
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
}