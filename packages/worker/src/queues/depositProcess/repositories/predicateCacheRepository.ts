import { CollectionName, MongoDatabase, type SchemaPredicateBlocks } from "../../../clients/mongoClient";

export class PredicateCacheRepository {
  constructor(private readonly client: MongoDatabase) {}

  async getLastUpdatePredicate(predicateAddress: string) {
    const predicateCache = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_UPDATE);

    const data = await predicateCache.findOne({ _id: predicateAddress });
    return data?.last_updated_at ? new Date(data.last_updated_at) : null;
  }

  async setLastUpdatePredicate(predicateAddress: string, date: Date) {
    const predicateCache = this.client.getCollection<SchemaPredicateBlocks>(CollectionName.DEPOSIT_TRANSACTIONS_LAST_UPDATE);

    await predicateCache.updateOne(
      { _id: predicateAddress },
      { $set: { last_updated_at: date } },
      { upsert: true }
    );
  }
}
