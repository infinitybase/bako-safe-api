import Queue from "bull";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks, type SchemaFuelAssets, type SchemaPredicateBalance } from "../../utils/mongoClient";
import { type QueueBalance, groupByTransaction, syncPredicateBlock, syncBalance, makeDeposits, syncAssets, QUEUE_BALANCE } from ".";
import { predicateTransactions } from "./utils/envioQuery";

const {
  WORKER_REDIS_HOST,
} = process.env;


const balanceQueue = new Queue<QueueBalance>(QUEUE_BALANCE, {
  redis: {
    host: WORKER_REDIS_HOST,
    tls: {
      rejectUnauthorized: false,
    },
  },
});

balanceQueue.process(async (job) => {
    const db = await MongoDatabase.connect();

    const { predicate_address } = job.data;
    const query = await predicateTransactions(predicate_address);

    // load collections
    const balance_collection = db.getCollection<SchemaPredicateBalance>(CollectionName.PREDICATE_BALANCE);
    const assets_collection = db.getCollection<SchemaFuelAssets>(CollectionName.FUEL_ASSETS);
    const predicate_block = db.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);
    const price_collection = db.getCollection<SchemaFuelAssets>(CollectionName.ASSET_BALANCE);
    
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
        await syncBalance(deposits, balance_collection, assets, price_collection);
        
        return `Processed ${deposits.length} deposits for ${predicate_address}`;
    } catch (e) {
        console.error(e);
        throw e;
    }
});

export default balanceQueue;