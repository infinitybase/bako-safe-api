import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";
import { Block } from "../types";

export class DepositBlockRepository {
  constructor(private readonly client: MongoDatabase) {}

  async syncLastBlock(predicateAddress: string, block: Block) {
    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.updateOne(
      { _id: predicateAddress },
      { $set: { blockNumber: block.height, timestamp: block.time } },
      { upsert: true }
    );
  }

  async getLastBlock(predicateAddress: string) {
    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.findOne({ _id: predicateAddress }); 
  }
}
