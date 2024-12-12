import Queue from "bull";
import { bn, InputType, OutputType } from "fuels";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks, type SchemaFuelAssets, type SchemaPredicateBalance } from "../mongo";
import { RedisReadClient } from "./RedisReadClient";

// fee:

        // some todas as entradas:
            // - predicate é owner
            // - asset_id é ETH
            // - input_type é Coin

        // encontre a saida change da tx
            // - to é predicate
            // - asset_id é ETH
            // - output_type é Change

        // some todas as saídas eth:
            // - asset_id é ETH
            // - output_type é Coin ou Variable



type Input = {
    tx_id: string;
    owner: string;
    amount: string;
    asset_id: string;
    input_type: number;
    recipient: string;
};

type Output = {
    tx_id: string;
    to: string;
    amount: string;
    asset_id: string;
    output_type: number;
};

type Transaction = {
    id: string;
    block_height: number;
    time: number;
    status: number;
};

type Block = {
    time: number;
    height: number;
}

type PredicateBalance = {
    inputs: Input[];
    outputs: Output[];
    transactions: Transaction[];
    blocks: Block[];
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

type PredicateBalanceTx = { inputs: Input[]; outputs: Output[], time: Date}

type PredicateBalanceGrouped = {
    [tx_id: string]: PredicateBalanceTx;
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
    const groupedData: Record<string, PredicateBalanceTx> = {};
    const groupedBlocks: Record<string, Date> = {};

    

    // console.log('[DATA]', data.length)
    for (const block of data) {
        for (const _block of block.blocks){
            if (!groupedBlocks[_block.height]) {
                groupedBlocks[_block.height] = new Date(_block.time * 1000);
            }
        }

        // Processa os inputs
        for (const input of block.inputs) {
            if (!groupedData[input.tx_id]) {
                groupedData[input.tx_id] = { inputs: [], outputs: [], time: new Date() };
            }
            groupedData[input.tx_id].inputs.push(input);
        }
    
        // Processa os outputs
        for (const output of block.outputs) {
            if (!groupedData[output.tx_id]) {
                groupedData[output.tx_id] = { inputs: [], outputs: [], time: new Date() };
            }
            groupedData[output.tx_id].outputs.push(output);
        }

        for (const tx of block.transactions) {
            // tx.status === 1 -> success
            // tx.status === 3 -> failed
            if(tx.status === 3) {
                delete groupedData[tx.id];
            }else{
                groupedData[tx.id] = { ...groupedData[tx.id], time: groupedBlocks[tx.block_height] };
            }
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
        transactions: Object.keys(tx_grouped).length,
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
    // calculating Fee
    // let fee = 0;
    // // biome-ignore lint/complexity/noForEach: <explanation>
    // Object.entries(tx_grouped).forEach(([tx_id, {inputs, outputs}]) => {
    //     let input = 0;
    //     let output = 0;
        
    //     for (const i of inputs) {
    //         const isInputValue = i.input_type === InputType.Coin && i.owner === predicate_address && i.asset_id === ETH
    //         if (isInputValue) {
    //             input += bn(i.amount).toNumber();
    //         }
    //     }

    //     for (const o of outputs) {
    //         const isBackValueFee = o.output_type === OutputType.Change && o.to === predicate_address
    //         const isOutputValue = o.asset_id === ETH && (o.output_type === OutputType.Coin || o.output_type === OutputType.Variable)
    //         if (isBackValueFee || isOutputValue) {
    //             output += bn(o.amount).toNumber();
    //         }
    //     }
    //     fee = bn(input).sub(output).toNumber();
    //     deposits.push({
    //         tx_id,
    //         amount: fee,
    //         assetId: ETH,
    //         predicate: predicate_address,
    //         usdValue: 0.0,
    //         createdAt: new Date(),
    //         verifiedToken: true,
    //         isDeposit: false,
    //         formatedAmount: 0.0
    //     })
    // })


    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(tx_grouped).forEach(([tx_id, {inputs, outputs}]) => {
        // assetId <> amount
        const inputs_grouped_by_assetId: {
            [assetId: string]: number;
        } = {}
        // if(tx_id === '0x29ccdab6523634479fec5d4eea2c6ab0e9b9249ea3bce11805862078ff413546') {
        //     console.log({tx_id, inputs, outputs})
        // }

        // soma todos os inputs que o vault enviou
        for (const i of inputs) {
            const isInputedByVault = i.input_type === InputType.Coin && i.owner === predicate_address
            // message sempre sao valores em ETH
            const isMessageOfL1 = i.input_type === InputType.Message && i.recipient === predicate_address && i.asset_id === '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07'
            if (isInputedByVault || isMessageOfL1) {
                if (!inputs_grouped_by_assetId[i.asset_id]) {
                    inputs_grouped_by_assetId[i.asset_id] = bn(i.amount).toNumber();
                }else{
                    inputs_grouped_by_assetId[i.asset_id] = bn(inputs_grouped_by_assetId[i.asset_id]).add(i.amount).toNumber();
                }
            }


            // mensagem é somada aos inputs, porque é um input para ser usado pelo vault
            if(isMessageOfL1) {
                const ETH = "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07"
                
                // if(predicate_address === '0x29ccdab6523634479fec5d4eea2c6ab0e9b9249ea3bce11805862078ff413546'){
                //     console.log('[MESSAGE_L1]', {
                //         tx_id,
                //         amount: bn(i.amount).toNumber(),
                //         assetId: ETH,
                //         predicate: predicate_address,
                //         usdValue: 0.0,
                //         createdAt: new Date(),
                //         verifiedToken: true,
                //         isDeposit: true,
                //         formatedAmount: 0.0
                //     })
                // }
                deposits.push({
                    tx_id,
                    amount: bn(i.amount).toNumber(),
                    assetId: ETH,
                    predicate: predicate_address,
                    usdValue: 0.0,
                    createdAt: new Date(tx_grouped[tx_id].time),
                    verifiedToken: true,
                    isDeposit: true,
                    formatedAmount: 0.0
                })

                
            }

            // if(tx_id === '0x7fb36bd9d91d21a311862093dd9f17828f08df99601ed6402311a886480ba46a'){
            //     console.log({tx_id, i, inputs_grouped_by_assetId, isMessageOfL1, inp: i.input_type === InputType.Message, recipient: i.recipient === predicate_address})
            // }

        }

        for (const o of outputs) {
            const isOutputedByVault = o.output_type === OutputType.Change && o.to === predicate_address
            if (isOutputedByVault) {
                if (!inputs_grouped_by_assetId[o.asset_id]) { // this should never happen
                    inputs_grouped_by_assetId[o.asset_id] = 0;
                }else{
                    inputs_grouped_by_assetId[o.asset_id] = bn(inputs_grouped_by_assetId[o.asset_id]).sub(o.amount).toNumber();
                }
                // if(predicate_address === '0xec8ff99af54e7f4c9dd81f32dffade6b41f3b980436ee2eabf47a069f998cd73'){
                //     console.log({tx_id, o, inputs_grouped_by_assetId})
                // }
            }
        }

        // EM MENSAGENS, ESTÁ ZERANDO que o vault recebe como troco
        // adiciona a lista todos os outputs que o vault enviou
        // biome-ignore lint/complexity/noForEach: <explanation>
        Object.entries(inputs_grouped_by_assetId).forEach(([assetId, value]) => {
            deposits.push({
                tx_id,
                amount: value,
                assetId,
                predicate: predicate_address,
                usdValue: 0.0,
                createdAt: new Date(tx_grouped[tx_id].time),
                verifiedToken: true,
                isDeposit: false,
                formatedAmount: 0.0,
            });
        });
        



        // soma todos os outputs que o vault recebeu
        for (const o of outputs) {
            const is = o.output_type === OutputType.Coin || o.output_type === OutputType.Variable;

            if (is && o.to === predicate_address) {
                deposits.push({
                    tx_id,
                    amount: bn(o.amount).toNumber(),
                    assetId: o.asset_id,
                    predicate: predicate_address,
                    usdValue: 0.0,
                    createdAt: new Date(tx_grouped[tx_id].time),
                    verifiedToken: false,
                    isDeposit: true,
                    formatedAmount: 0.0,
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

        console.log('[DEPOSITS_TO_SAVE]: ', deposits.length);
        // let balance = 0.0;
        // Deposits
        if (deposits.length > 0) {
            
            for await (const deposit of deposits) {
                const usdcPrice = await RedisReadClient.getQuote(deposit.assetId); 
                const units = assets.find(a => a._id === deposit.assetId)?.decimals ?? 9;
                
                const depositPriceUsd = bn(deposit.amount).format({
                    units,
                }).replace(/,/g, '');

                const value = Number(depositPriceUsd) * usdcPrice * (deposit.isDeposit ? 1 : -1);
                const verifiedToken = assets.find(a => a._id === deposit.assetId)?.verified ?? false
                // if(deposit.tx_id === '0x13b6f51aae44e4bb2fb73e47c5da64c3d218fc31410e4c747d8ebb3658ae110e') {
                //     console.log({
                //         ...deposit,
                //         usdValue: verifiedToken ? Number(value.toFixed(12)) : 0.0,
                //         verifiedToken,
                //         formatedAmount: verifiedToken ? Number(deposit.isDeposit ? depositPriceUsd : `-${depositPriceUsd}`) : 0.0,
                //         depositPriceUsd,
                //         usdcPrice,
                //     })
                // }
                await balance_collection.insertOne({
                    ...deposit,
                    usdValue: verifiedToken ? Number(value.toFixed(12)) : 0.0,
                    verifiedToken: verifiedToken,
                    formatedAmount: verifiedToken ? Number(deposit.isDeposit ? depositPriceUsd : `-${depositPriceUsd}`) : 0.0,
                })
            }
        }
    } catch (e) {
        console.error(e);
    }
});

// ezETH
// USDC 
// EDR
// USDT


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