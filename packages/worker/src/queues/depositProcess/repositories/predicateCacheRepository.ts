import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";

export class PredicateCacheRepository {
  private client: MongoDatabase | undefined;

  async init() {
    this.client = await MongoDatabase.connect();
  }

  async getLastUpdatePredicate(predicateAddress: string) {
    if (!this.client) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const predicateCache = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_UPDATE);

    const data = await predicateCache.findOne({ _id: predicateAddress });
    return data?.last_updated_at ? new Date(data.last_updated_at) : null;
  }

  async setLastUpdatePredicate(predicateAddress: string, date: Date) {
    if (!this.client) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const predicateCache = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_UPDATE);

    await predicateCache.updateOne(
      { _id: predicateAddress },
      { $set: { last_updated_at: date } },
      { upsert: true }
    );
  }
}
