import type { Collection } from "mongodb";
import type { SchemaPredicateBlocks } from "../../../clients/mongoClient";

export async function syncPredicateBlock(
  block: SchemaPredicateBlocks,
  schema: Collection<SchemaPredicateBlocks>
): Promise<void> {
  await schema.updateOne(
    { _id: block._id },
    {
      $set: {
        blockNumber: block.blockNumber,
        timestamp: block.timestamp,
      },
      $inc: { transactions: block.transactions || 0 },
    },
    { upsert: true }
  );
}
