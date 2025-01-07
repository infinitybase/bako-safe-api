import Queue from "bull";
import { CollectionName, MongoDatabase } from "../../utils/mongoClient";
import { QUEUE_ASSET } from "./constants";
import { fetchQuotes } from "./utils";

const { WORKER_REDIS_HOST } = process.env;

const assetQueue = new Queue(QUEUE_ASSET, {
  redis: WORKER_REDIS_HOST,
});

console.log("[QUEUE_CREATION]", assetQueue.name);

assetQueue.process(async (job) => {
  const db = await MongoDatabase.connect();
  const collection = db.getCollection(CollectionName.ASSET_BALANCE);

  console.log("[QUEUE_ASSET] exec", job.data.assetId);

  const quots = await fetchQuotes();
  console.log("[QUEUE_ASSET] quotes", quots);
  for await (const quote of quots) {
    await collection.updateOne(
      // @ts-ignore
      { _id: quote.assetId },
      { $set: { usdValue: quote.price, createdAt: new Date() } },
      { upsert: true }
    );
  }

  return `Processed ${job.data.assetId}`;
});

export default assetQueue;
