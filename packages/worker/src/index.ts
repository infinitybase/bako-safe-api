import { ExpressAdapter } from "@bull-board/express";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { createBullBoard } from "@bull-board/api";
import balanceQueue from "./queues/predicateBalance/queue";
import express from "express";
import BalanceCron from "./queues/predicateBalance/scheduler";
import AssetCron from "./queues/assetsValue/scheduler";
import assetQueue from "./queues/assetsValue/queue";
import { MongoDatabase } from "./utils/mongoClient";
import { PsqlClient } from "./utils";

const { WORKER_PORT } = process.env;

const app = express();
const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullAdapter(balanceQueue), new BullAdapter(assetQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());
app.get("/healthcheck", ({ res }) => res?.status(200).send({ status: "ok" }));

MongoDatabase.connect();
PsqlClient.connect();

BalanceCron.create();
AssetCron.create();

app.listen(WORKER_PORT ?? 3063, () =>
  console.log(`Server running on ${WORKER_PORT}`)
);
