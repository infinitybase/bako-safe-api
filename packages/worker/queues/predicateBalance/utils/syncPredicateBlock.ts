import type { Collection } from "mongodb";
import type { SchemaPredicateBlocks } from "../../../utils/mongo";

export async function syncPredicateBlock(block: SchemaPredicateBlocks, schema: Collection<SchemaPredicateBlocks>): Promise<void> {
    await schema.updateOne(
        { _id: block._id },
        {
            $setOnInsert: {
                blockNumber: block.blockNumber,
                timestamp: block.timestamp,
            },
            $inc: { transactions: block.transactions },
        },
        { upsert: true }
    );
}