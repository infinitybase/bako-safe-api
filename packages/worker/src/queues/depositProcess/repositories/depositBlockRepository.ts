import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";
import { UpdateResult } from 'mongodb';

export class DepositBlockRepository {
  constructor(private readonly client: MongoDatabase) {}

  async syncLastBlock(predicateAddress: string, block: number): Promise<UpdateResult> {
    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.updateOne(
      { _id: predicateAddress },
      { $set: {
          blockNumber: block,
          timestamp: new Date().getTime()
        }
      },
      { upsert: true }
    );
  }

  async getLastBlock(predicateAddress: string): Promise<SchemaPredicateBlocks | null> {
    const predicateBlock = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_BLOCK);

    return await predicateBlock.findOne({ _id: predicateAddress });
  }
}
