import "graphql-import-node";

import { GatewayServer } from "@/server";
import { Database } from '@/lib';

const { GATEWAY_PORT, FUEL_PROVIDER, API_URL } = process.env;

const main = async () => {
  const server = new GatewayServer(GATEWAY_PORT);
  const database = await Database.connect();
  server.setDatabase(database);
  server.start();
}

main().catch((reason) => {
  console.error('[GATEWAY SERVER] Failed to start server', reason);
  process.exit(1);
});

