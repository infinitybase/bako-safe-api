import "graphql-import-node";

import { GatewayServer } from "@/server";
import { Database } from '@/database';

const { PORT } = process.env;

const main = async () => {
  const server = new GatewayServer(PORT);
  await Database.connect();
  server.start();
}

main().catch((reason) => {
  console.error('[GATEWAY SERVER] Failed to start server', reason);
  process.exit(1);
});