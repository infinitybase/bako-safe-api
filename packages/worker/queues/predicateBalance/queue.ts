import Queue from "bull";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks, type SchemaFuelAssets, type SchemaPredicateBalance } from "../../utils/mongo";
import { RedisReadClient } from "../../utils/redis/RedisReadClient";
import { type QueueBalance, groupByTransaction, syncPredicateBlock, syncBalance, makeDeposits, syncAssets, QUEUE_BALANCE } from ".";
import { predicateTransactions } from "./utils/envioQuery";

const balanceQueue = new Queue<QueueBalance>(QUEUE_BALANCE, {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

balanceQueue.process(async (job) => {
    await RedisReadClient.start();
    const db = await MongoDatabase.connect();

    const { predicate_address } = job.data;
    const query = await predicateTransactions(predicate_address);

    // load collections
    const balance_collection = db.getCollection<SchemaPredicateBalance>(CollectionName.PREDICATE_BALANCE);
    const assets_collection = db.getCollection<SchemaFuelAssets>(CollectionName.FUEL_ASSETS);
    const predicate_block = db.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);
    
    try {
        // group by transaction
        const tx_grouped = groupByTransaction(query.data ?? []);

        // sync predicate block
        const predicate_sync_block: SchemaPredicateBlocks = {
            _id: predicate_address,
            blockNumber: query.next_block,
            timestamp: Date.now(),
            transactions: Object.keys(tx_grouped).length,
        }
        await syncPredicateBlock(predicate_sync_block, predicate_block);

        // process balance
        const deposits: SchemaPredicateBalance[] = await makeDeposits(tx_grouped, predicate_address);
        const assets = await syncAssets(deposits, assets_collection);
        await syncBalance(deposits, balance_collection, assets);
        
        return `Processed ${deposits.length} deposits for ${predicate_address}`;
    } catch (e) {
        console.error(e);
        throw e;
    }
});

// balanceQueue.on("completed", (job) => {
//     console.log(job.returnvalue);
// });


export default balanceQueue;