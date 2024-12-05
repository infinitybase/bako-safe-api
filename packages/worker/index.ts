import { ExpressAdapter } from "@bull-board/express";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { createBullBoard } from "@bull-board/api";
import myQueue from "./utils/redis/queue";
import express from "express";
import { fn } from "./utils/redis/scheduler";

const app = express();
const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullAdapter(myQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

fn();

