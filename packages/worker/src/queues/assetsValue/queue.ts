import Queue from "bull";
import { CollectionName, MongoDatabase } from "../../utils/mongoClient";
import { QUEUE_ASSET } from "./constants";
import { fetchQuotes } from "./utils";
import { redisConfig } from "@/utils/redis";

const assetQueue = new Queue(QUEUE_ASSET, {
  redis: redisConfig,
});

assetQueue.process(async (job) => {
  const db = await MongoDatabase.connect();
  const collection = db.getCollection(CollectionName.ASSET_BALANCE);

  const quots = await fetchQuotes();
  for await (const quote of quots) {
    await collection.updateOne(
      // @ts-ignore
      { _id: quote.assetId },
      { $set: { usdValue: quote.price, createdAt: new Date() } },
      { upsert: true }
    );
  }

  console.log(`[${QUEUE_ASSET}] Processed JOB ${job.data.assetId}`, new Date());
  return `Processed ${job.data.assetId}`;
});

export default assetQueue;
