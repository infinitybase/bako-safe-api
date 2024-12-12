import { bn, ScriptTransactionRequest, transactionRequestify } from "fuels";
import { Database } from "../database";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../mongo";
import myQueue from "./queue";

const TIME_SLEEP = 1000000000

// simplifyed querys
const query = ({
    from_block,
    predicate_address,
}: { from_block: number; predicate_address: string }) => {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from_block: 0,
            inputs: [
                {
                    inputType: [0, 2],
                    txStatus: [1],
                    owner: [predicate_address],
                    recipient: [predicate_address],
                },
            ],
            outputs: [
                {
                    outputType: [0, 3],
                    txStatus: [1],
                    to: [predicate_address],
                },
            ],
            field_selection: {
                output: ["tx_id", "to", "amount", "asset_id", "output_type"],
                input: ["tx_id", "owner", "amount", "asset_id", "input_type", "recipient"],
                transaction: ["id", "block_height", "time", "status"],
            },
        }),
    };
};
export const fn = async () => {
    console.log('[SCHEDULER] Starting...')
    const db = await Database.connect();
    const A = [
        // mainnet
        "0xec8ff99af54e7f4c9dd81f32dffade6b41f3b980436ee2eabf47a069f998cd73",
        // "0x12bc8c902e4bffe7d73eb5d9126def7f0dd46966d6df34512e5acd0ebe1da684",
        // "0x7921769cf0105b0c353e4d1c9162fd1228415b9dc3e2ad3891d18a39fe5696e0",
        // "0xa94e724edf35fe7c5d7eac7de7d871632e3187f02b27ad6d494df0cff5360587",
        // "0xb8b7506e5f1796685ed9737754d2ba7db1a61a8a464194104172e2384dd1ceb4",

        "0x29ccdab6523634479fec5d4eea2c6ab0e9b9249ea3bce11805862078ff413546", // tem bridge nativo da fuel (l3)

        // fuel vault
        "0xf259aa578a90fe2572dc63406029846e29e8b3416c23910b4f56824ed83def2a",

        // error
        "0x001f7f9c67c4eb3873c0f85b360ae5eaff3479d82c8945cd7484e870af25621b",
        "0x01148c6a565f830e01a65160f7da98b6442425eac61ab9a9f9a78e17b5f2189e"

        // stg
        // "0x63403dac4c4b632547c601c40f3c41634afa8b6e34726791eaf2fc12e7e89b75",
        // "0x7b7f3264a8ae5503ac51912a1a3f25455449bb39f3fc2ac133e7c6acebd15123",
        // "0xf2fbcb235c6d140ac7f763df446e73ad80b5ebe00e79d2e4ed8c5866c576fc31",
        // "0x862c3b0f5e8a4cebcb5d972f5c865ef50b50bff27e4d6926291dd0bb1b4b97c7"
    ];
    const _predicates = await db.query(
        `
            SELECT predicate_address
            FROM predicates
            WHERE predicate_address = ANY($1)
        `,
        [A]
    );
    // const limit = "10000";
    // const _predicates = await db.query(
    //     `SELECT predicate_address 
    //      FROM predicates 
    //      ORDER BY predicate_address DESC 
    //      LIMIT $1`,
    //     [limit]
    // )
    console.log('[predicates]: ', _predicates.length)
    const predicates = _predicates;
    for (const predicate of predicates) {
        const mongodb = await MongoDatabase.connect();
        const predicate_block = mongodb.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);
        const last = await predicate_block.findOne({ _id: predicate.predicate_address });

        try{
                const predicateAddress = predicate.predicate_address;
                const data = await fetch(
                    "https://fuel.hypersync.xyz/query",
                    // replace from_block with the last block processed
                    query({ from_block: last?.blockNumber ?? 0, predicate_address: predicateAddress })
                );
                const response = await data.json();
                if(response.data.length > 0) {  
                    await myQueue.add(
                        {
                            predicate_address: predicateAddress,
                            query: response,
                        },
                        {
                            attempts: 3,
                            backoff: 5000,
                        }
                    );
                }
            }catch(e){
                console.log(e, data)
            }
    }

    console.log('[SCHEDULER] sleeping...')
    setTimeout(async () => {
        await fn();
    }, TIME_SLEEP);
};
