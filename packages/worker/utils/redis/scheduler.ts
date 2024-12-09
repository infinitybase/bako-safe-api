import { Database } from "../database";
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../mongo";
import myQueue from "./queue";

const TIME_SLEEP = 1000000000


// simplifyed querys
// const A = [
    // "0x63403dac4c4b632547c601c40f3c41634afa8b6e34726791eaf2fc12e7e89b75",
    // "0x7b7f3264a8ae5503ac51912a1a3f25455449bb39f3fc2ac133e7c6acebd15123",
    // "0xf2fbcb235c6d140ac7f763df446e73ad80b5ebe00e79d2e4ed8c5866c576fc31",
    // "0x862c3b0f5e8a4cebcb5d972f5c865ef50b50bff27e4d6926291dd0bb1b4b97c7"
    // ];
    // const _predicates = await db.query(
    //     `
    //         SELECT predicate_address
    //         FROM predicates
    //         WHERE predicate_address = ANY($1)
    //     `,
    //     [A]
    // );
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
            from_block: from_block,
            inputs: [
                {
                    inputType: [0],
                    txStatus: [1],
                    owner: [predicate_address],
                },
            ],
            outputs: [
                {
                    outputType: [0],
                    txStatus: [1],
                    to: [predicate_address],
                },
            ],
            field_selection: {
                output: ["tx_id", "to", "amount", "asset_id", "output_type"],
                input: ["tx_id", "owner", "amount", "asset_id", "input_type"],
            },
        }),
    };
};
export const fn = async () => {
    console.log('[SCHEDULER] Starting...')
    const db = await Database.connect();
    const limit = "2000";
    const _predicates = await db.query(
        `SELECT predicate_address 
         FROM predicates 
         ORDER BY predicate_address DESC 
         LIMIT $1`,
        [limit]
    )

    console.log('[predicates]: ', _predicates.length)
    const predicates = _predicates;
    for (const predicate of predicates) {
        const mongodb = await MongoDatabase.connect();
        const predicate_block = mongodb.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);
        const last = await predicate_block.findOne({ _id: predicate.predicate_address });


        const predicateAddress = predicate.predicate_address;
        const data = await fetch(
            "https://fuel.hypersync.xyz/query",
            // replace from_block with the last block processed
            query({ from_block: last?.blockNumber ?? 0, predicate_address: predicateAddress })
        );
            try{
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
