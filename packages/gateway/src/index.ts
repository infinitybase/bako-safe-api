import "graphql-import-node";

import { BakoSafe } from 'bakosafe';

import { GatewayServer } from "@/server";
import { Database } from '@/lib';

const { PORT, FUEL_PROVIDER } = process.env;

BakoSafe.setProviders({
  SERVER_URL: 'http://localhost:3333',
  CHAIN_URL: FUEL_PROVIDER
});

const main = async () => {
  const server = new GatewayServer(PORT);
  await Database.connect();
  server.start();
}

main().catch((reason) => {
  console.error('[GATEWAY SERVER] Failed to start server', reason);
  process.exit(1);
});