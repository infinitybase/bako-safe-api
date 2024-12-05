import Queue from "bull";
import { bn, OutputType } from "fuels";
import { CollectionName, MongoDatabase, type SchemaFuelAssets, type SchemaPredicateBalance } from "../mongo";
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
    // console.log(`Job completed with result: ${JSON.stringify(job.returnvalue)}`);
})

myQueue.process(async (job) => {
    await RedisReadClient.start();
    const db = await MongoDatabase.connect();
    const usdPrices = await RedisReadClient.getActiveQuotes();
    
    const balance_collection = db.getCollection<SchemaPredicateBalance>(CollectionName.PREDICATE_BALANCE);
    const assets_collection = db.getCollection<SchemaFuelAssets>(CollectionName.FUEL_ASSETS);

    const { query, predicate_address } = job.data;
    const tx_grouped = groupByTransaction(query.data ?? []);

    const deposits: SchemaPredicateBalance[] = [];

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(tx_grouped).forEach(([tx_id, {inputs, outputs}]) => {
        for (const o of outputs) {
            if (o.output_type === OutputType.Coin) {
                const _id = `${o.asset_id.slice(0, 10)}-${tx_id.slice(0, 10)}-${o.amount}`;
                deposits.push({
                    _id,
                    tx_id,
                    amount: Number(o.amount),
                    assetId: o.asset_id,
                    predicate: predicate_address,
                    usdValue: '0',
                    createdAt: new Date(),
                    verifiedToken: false,
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
            const isNFT = assetData?.is_nft ?? false;
            const newAsset: SchemaFuelAssets = {
                _id: assetData?.asset_id ?? missAsset,
                name: assetData.name ?? assetData?.metadata?.name ?? '',
                icon: assetData.icon ?? assetData?.metadata?.URI ?? '',
                symbol: assetData.symbol,
                decimals: assetData.decimals ?? isNFT ? 1 : 9,
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
                const usdcPrice = usdPrices[deposit.assetId] ?? 1;
                const units = assets.find(a => a._id === deposit.assetId)?.decimals ?? 9;
                
                const depositPriceUsd = bn(deposit.amount).format({
                    units,
                })
                const value = `${Number(depositPriceUsd) * usdcPrice}`
                console.log({
                    deposit,
                    usdcPrice,
                    units,
                    value,
                    depositPriceUsd,
                })
                await balance_collection.updateOne(
                    { _id: deposit._id },
                    { $setOnInsert: {
                        ...deposit,
                        usdValue: value,
                        verifiedToken: assets.find(a => a._id === deposit.assetId)?.verified ?? false,
                    } },
                    { upsert: true }
                )
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
// se o address do predicate for owner de um input do tipo 2

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