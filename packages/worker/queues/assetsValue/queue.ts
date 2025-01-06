import Queue from "bull";
import { CollectionName, MongoDatabase } from "../../utils/mongo";
import { QUEUE_ASSET } from "./constants";
import { fetchQuotes } from "./utils";

const { WORKER_REDIS_HOST, WORKER_REDIS_PORT } = process.env;

const assetQueue = new Queue(QUEUE_ASSET, {
  redis: {
    host: WORKER_REDIS_HOST,
    port: Number(WORKER_REDIS_PORT),
  },
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

  return `Processed ${job.data.assetId}`;
});

export default assetQueue;
