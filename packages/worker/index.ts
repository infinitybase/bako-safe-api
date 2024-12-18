import { ExpressAdapter } from "@bull-board/express";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { createBullBoard } from "@bull-board/api";
import balanceQueue from "./queues/predicateBalance/queue";
import express from "express";
import { startBalanceScheduler } from "./queues";

const app = express();
const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullAdapter(balanceQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

startBalanceScheduler();