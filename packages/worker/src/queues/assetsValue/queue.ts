import Queue from "bull";
import { CollectionName, MongoDatabase } from "../../clients/mongoClient";
import { QUEUE_ASSET } from "./constants";
import { fetchQuotes } from "./utils";
import { redisConfig } from "@/clients";

const assetQueue = new Queue(QUEUE_ASSET, {
  redis: redisConfig,
});

/**
 * This queue is designed to keep the USD value (in USDC) of specific assets updated.
 * The update frequency depends on the cron expression, with a recommended interval of 20 minutes.
 *
 * Process:
 * 1. Fetch the list of verified assets from the Fuel Network using the link: https://verified-assets.fuel.network/assets.json.
 * 2. Filter the assets to include only those on the Fuel Network (mainnet and testnet).
 * 3. Map the filtered assets to match the naming conventions used by the CoinGecko API.
 * 4. Retrieve the USD values of the assets from the CoinGecko API. link: https://api.coingecko.com/api/v3/simple/
 * 5. Update the database with the fetched USD values, using USDC as the base currency.
 */

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
