import Queue from "bull";
import { CollectionName, MongoDatabase } from "../../utils/mongo";
import { QUEUE_ASSET } from "./constants";
import { fetchQuotes } from "./utils";

const assetQueue = new Queue(QUEUE_ASSET, {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
})

assetQueue.process(async (job) => {
  const db = await MongoDatabase.connect();
  const collection = db.getCollection(CollectionName.ASSET_BALANCE);
  
  const quots = await fetchQuotes();

  for await (const quote of quots) {
    await collection.updateOne(
      // @ts-ignore
      { _id: quote.assetId },
      { $set: {usdValue: quote.price, createdAt: new Date()} },
      { upsert: true }
    );
  }

  return `Processed ${job.data.assetId}`;
});



export default assetQueue;