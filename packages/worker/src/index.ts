import { ExpressAdapter } from "@bull-board/express";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { createBullBoard } from "@bull-board/api";
import balanceQueue from "./queues/predicateBalance/queue";
import express from "express";
import BalanceCron from "./queues/predicateBalance/scheduler";
import AssetCron from "./queues/assetsValue/scheduler";
import assetQueue from "./queues/assetsValue/queue";
import { MongoDatabase } from "./clients/mongoClient";
import { PsqlClient } from "./clients";

const {
  WORKER_PORT,
  WORKER_ENVIRONMENT,
  WORKER_NAME,
  WORKER_REDIS_HOST,
  WORKER_REDIS_PORT,
  WORKER_MONGO_PORT,
  WORKER_MONGO_ENVIRONMENT,
  WORKER_MONGO_PASSWORD,
  WORKER_MONGO_USERNAME,
  WORKER_MONGO_HOST,
  WORKER_DATABASE_NAME,
  WORKER_DATABASE_PASSWORD,
  WORKER_DATABASE_USERNAME,
  WORKER_DATABASE_PORT,
  WORKER_DATABASE_HOST,
} = process.env;

console.log(
  JSON.stringify({
    WORKER_PORT,
    WORKER_ENVIRONMENT,
    WORKER_NAME,
    WORKER_REDIS_HOST,
    WORKER_REDIS_PORT,
    WORKER_MONGO_PORT,
    WORKER_MONGO_ENVIRONMENT,
    WORKER_MONGO_PASSWORD,
    WORKER_MONGO_USERNAME,
    WORKER_MONGO_HOST,
    WORKER_DATABASE_NAME,
    WORKER_DATABASE_PASSWORD,
    WORKER_DATABASE_USERNAME,
    WORKER_DATABASE_PORT,
    WORKER_DATABASE_HOST,
  })
);

const app = express();
const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullAdapter(balanceQueue), new BullAdapter(assetQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/worker/queues");
app.use("/worker/queues", serverAdapter.getRouter());
app.get("/healthcheck", ({ res }) => res?.status(200).send({ status: "ok" }));

// database
MongoDatabase.connect();
PsqlClient.connect();

// schedulers
BalanceCron.create();
AssetCron.create();

app.listen(WORKER_PORT ?? 3063, () =>
  console.log(`Server running on ${WORKER_PORT}`)
);
