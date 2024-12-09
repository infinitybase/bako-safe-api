import Queue from "bull";
import { bn, OutputType } from "fuels";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks, type SchemaFuelAssets, type SchemaPredicateBalance } from "../mongo";
import { RedisReadClient } from "./RedisReadClient";

type Input = {
    tx_id: string;
    owner: string;
    amount: string;
    asset_id: string;
    input_type: number;
};

type Output = {
    tx_id: string;
    to: string;
    amount: string;
    asset_id: string;
    output_type: number;
};

type PredicateBalance = {
    inputs: Input[];
    outputs: Output[];
}

type PredicateBalanceQuery = {
    data: PredicateBalance[];
    archive_height: number;
    next_block: number;
    total_execution_time: number;
}

type QueueBalance = {
    predicate_address: string;
    query: PredicateBalanceQuery;
}

type PredicateBalanceGrouped = {
    [tx_id: string]: { inputs: Input[]; outputs: Output[] };
}


// INPUT_TYPE -> 
    // 0 = InputCoin,
    // 1 = InputContract,
    // 2 = InputMessage,


// OUTPUT_TYPE ->
    // 0 = CoinOutput,
    // 1 = ContractOutput,
    // 2 = ChangeOutput,
    // 3 = VariableOutput,
    // 4 = ContractCreated,

const myQueue = new Queue<QueueBalance>("example-queue", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

function groupByTransaction(data: PredicateBalance[]): PredicateBalanceGrouped {
    const groupedData: Record<string, { inputs: Input[]; outputs: Output[] }> = {};

    for (const block of data) {
        // Processa os inputs
        for (const input of block.inputs) {
            if (!groupedData[input.tx_id]) {
                groupedData[input.tx_id] = { inputs: [], outputs: [] };
            }
            groupedData[input.tx_id].inputs.push(input);
        }
    
        // Processa os outputs
        for (const output of block.outputs) {
            if (!groupedData[output.tx_id]) {
                groupedData[output.tx_id] = { inputs: [], outputs: [] };
            }
            groupedData[output.tx_id].outputs.push(output);
        }
    }

    return groupedData;
}


myQueue.on("completed", (job) => {
    console.log(`Job completed with result: ${job.id}`);
})

myQueue.process(async (job) => {
    await RedisReadClient.start();
    const db = await MongoDatabase.connect();
    
    const balance_collection = db.getCollection<SchemaPredicateBalance>(CollectionName.PREDICATE_BALANCE);
    const assets_collection = db.getCollection<SchemaFuelAssets>(CollectionName.FUEL_ASSETS);
    const predicate_block = db.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);

    const { query, predicate_address } = job.data;
    const tx_grouped = groupByTransaction(query.data ?? []);
    const predicate_sync_block: SchemaPredicateBlocks = {
        _id: predicate_address,
        blockNumber: query.next_block,
        timestamp: Date.now(),
        transactions: query.data.length,
    }

    await predicate_block.updateOne(
        { _id: predicate_sync_block._id },
        {
            $setOnInsert: {
                blockNumber: predicate_sync_block.blockNumber,
                timestamp: predicate_sync_block.timestamp,
            },
            $inc: { transactions: predicate_sync_block.transactions },
        },
        { upsert: true }
    );

    const deposits: SchemaPredicateBalance[] = [];

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(tx_grouped).forEach(([tx_id, {inputs, outputs}]) => {
        for (const o of outputs) {
            if (o.output_type === OutputType.Coin && o.to === predicate_address) {
                deposits.push({
                    tx_id,
                    amount: Number(o.amount),
                    assetId: o.asset_id,
                    predicate: predicate_address,
                    usdValue: 0.0,
                    createdAt: new Date(),
                    verifiedToken: false,
                    isDeposit: true,
                });
            }
        }
    })

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(tx_grouped).forEach(([tx_id, {inputs, outputs}]) => {
        // assetId <> amount
        const inputs_grouped_by_assetId: {
            [assetId: string]: number;
        } = {}

        for (const i of inputs) {
            if (i.input_type === OutputType.Coin && i.owner === predicate_address) {
                if (!inputs_grouped_by_assetId[i.asset_id]) {
                    inputs_grouped_by_assetId[i.asset_id] = bn(0).toNumber();
                }
                inputs_grouped_by_assetId[i.asset_id] = bn(inputs_grouped_by_assetId[i.asset_id]).add(i.amount).toNumber();
            }
        }

        for (const o of outputs) {
            if (o.output_type === OutputType.Change && o.to === predicate_address) {        
                const amount = bn(o.amount).sub(inputs_grouped_by_assetId[o.asset_id] ?? 0).toNumber();
                deposits.push({
                    tx_id,
                    amount,
                    assetId: o.asset_id,
                    predicate: predicate_address,
                    usdValue: 0.0,
                    createdAt: new Date(),
                    verifiedToken: false,
                    isDeposit: false,
                });
            }
        }
    })

    try {
        // Assets info
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


        // Deposits
        if (deposits.length > 0) {
            for await (const deposit of deposits) {
                const usdcPrice = await RedisReadClient.getQuote(deposit.assetId); 
                const units = assets.find(a => a._id === deposit.assetId)?.decimals ?? 9;
                
                const depositPriceUsd = bn(deposit.amount).format({
                    units,
                })
                const value = Number(depositPriceUsd) * usdcPrice * (deposit.isDeposit ? 1 : -1);

                await balance_collection.insertOne({
                    ...deposit,
                    usdValue: Number(value.toFixed(12)),
                    verifiedToken: assets.find(a => a._id === deposit.assetId)?.verified ?? false,
                })
            }
        }
    } catch (e) {
        console.error(e);
    }
});

// [DEPOSITO PARA PREDICATE]
// se o address do predicate for to em input do tipo 2

// adicione o valor do input a tabela de balances


// [VALORES ENVIADOS POR PREDICATES]
// se o address do predicate for owner de um input do tipo 0
// se o address do predicate for owner de um output do tipo 2

// subtraia o valor do output pelo input e salve na tabela -> terá sinal negativo


// myQueue.on("completed", (job) => {
//   console.log(`Job completed with result: ${job.returnvalue}`);
// });

// myQueue.on("failed", (job, err) => {
//   console.error(`Job ${job.id} failed: ${err.message}`);
// });

// myQueue.process(async (job) => {
//     console.log(`Processing job ${job.id} with data:`, job.data);
// });

export default myQueue;