import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";
import { Block } from "../types";
import { ObjectId } from "mongodb";

export class DepositBlockRepository {
  private client: MongoDatabase | undefined;

  async init() {
    this.client = await MongoDatabase.connect();
  }

  async syncLastBlock(predicateAddress: string, block: Block) {
    if (!this.client) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.updateOne(
      { _id: predicateAddress },
      { $set: { blockNumber: block.height, timestamp: block.time } },
      { upsert: true }
    );
  }

  async getLastBlock(predicateAddress: string) {
    if (!this.client) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.findOne({ _id: predicateAddress }); 
  }
}
