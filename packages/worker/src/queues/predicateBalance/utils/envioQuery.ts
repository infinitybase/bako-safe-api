
import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";

export const makeQuery = ({
    from_block,
    predicate_address,
}: { from_block: number; predicate_address: string }) => {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from_block,
            inputs: [
                {
                    txStatus: [1],
                    owner: [predicate_address],
                },
                {
                    txStatus: [1],
                    recipient: [predicate_address],
                }
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
                block: ["time", "height"],
            },
        }),
    };
};

export const predicateTransactions = async (predicate: string) => {
        const mongodb = await MongoDatabase.connect();
        const predicate_block = mongodb.getCollection<SchemaPredicateBlocks>(CollectionName.PREDICATE_BLOCKS);
        // @ts-ignore
        const last = await predicate_block.findOne({ _id: predicate });
    
        const data = await fetch(
            "https://fuel.hypersync.xyz/query",
            makeQuery({ from_block: last?.blockNumber ?? 0, predicate_address: predicate })
        );
        const response = await data.json();
        return response ?? undefined;
}