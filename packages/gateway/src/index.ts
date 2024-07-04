import "graphql-import-node";

import { BakoSafe } from 'bakosafe';

import { GatewayServer } from "@/server";
import { Database } from '@/lib';

const { API_PORT, FUEL_PROVIDER, BAKO_SERVER } = process.env;

BakoSafe.setProviders({
  SERVER_URL: BAKO_SERVER,
  CHAIN_URL: FUEL_PROVIDER
});

const main = async () => {
  const server = new GatewayServer(API_PORT);
  await Database.connect();
  server.start();
}

main().catch((reason) => {
  console.error('[GATEWAY SERVER] Failed to start server', reason);
  process.exit(1);
});

