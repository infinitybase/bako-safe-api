import Queue from "bull";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks, type SchemaFuelAssets, type SchemaPredicateBalance } from "../../clients/mongoClient";
import { type QueueBalance, groupByTransaction, syncPredicateBlock, syncBalance, makeDeposits, syncAssets, QUEUE_BALANCE } from ".";
import { predicateTransactions } from "./utils/envioQuery";
import { redisConfig } from "@/clients";


const balanceQueue = new Queue<QueueBalance>(QUEUE_BALANCE, {
    redis: redisConfig,
})

/**
 * This queue is responsible for reconstructing the transaction history of a Bako wallet to calculate its current balance.
 * 
 * Process:
 * 1. Query the Fuel Network indexer at the API endpoint: https://fuel.hypersync.xyz/query. 
 * The query retrieves all transactions involving the wallet starting from the last monitored block. 
 * These transactions include both received and sent funds, limited to transaction types `create` and `script`. 
 * The query ensures the wallet's address is present in the inputs or outputs and that the transaction was successfully executed.
 * 
 * 2. Group the retrieved transactions by their IDs, organizing inputs, outputs, and block-related information 
 * in a key-value object structure: `{ tx_id: tx_infos }`.
 * 
 * 3. For each transaction, calculate the net balance (credit or debit) resulting from the transaction for the wallet:
 *    - Subtract the total spent (gas fees and coins used) from the total received.
 *    - Include values from the native bridge, which initially appear as `Message` type until consumed.
 *    - Map all assets involved, including unofficial ones.
 *    - Assign an equivalent value in USDC for official network assets, using currency values monitored by the corresponding queue.
 * 
 * 4. The result of this processing is a list of all balances for every transaction, broken down by `assetId` and `tx`.
 * 
 * 5. Save all balance information in a non-relational database.
 * 
 * 6. Record the last processed block for the wallet, linked to its address, to ensure subsequent executions start from the last processed block.
 */





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