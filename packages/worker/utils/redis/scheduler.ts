import { Database } from "../database";
import myQueue from "./queue";



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
    const db = await Database.connect();
    console.log("[CONNECTED]");
    const limit = "2000";
    const _predicates = await db.query(
        `SELECT predicate_address 
         FROM predicates 
         ORDER BY predicate_address DESC 
         LIMIT $1`,
        [limit]
        // `SELECT predicate_address 
        //     FROM predicates 
        //     WHERE predicate_address = $1`,
        // ['0x63403dac4c4b632547c601c40f3c41634afa8b6e34726791eaf2fc12e7e89b75']
    );
    const predicates = _predicates;
    for (const predicate of predicates) {
        const predicateAddress = predicate.predicate_address;
        const data = await fetch(
            "https://fuel.hypersync.xyz/query",
            // replace from_block with the last block processed
            query({ from_block: 0, predicate_address: predicateAddress })
        );
            try{
                const response = await data.json();

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
            }catch(e){
                console.log(e, data)
            }
    }

    setTimeout(async () => {
        await fn();
    }, 100000);
};
