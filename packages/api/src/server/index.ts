import { BakoSafe } from 'bakosafe';

import app from './app';
import Bootstrap from './bootstrap';

const { API_PORT, PORT, API_ENVIRONMENT } = process.env;

const start = async () => {
  const port = API_PORT || PORT || 3333;

  await Bootstrap.start();

  console.log('[APP] Storages started', {
    active_sessions: app._sessionCache.getActiveSessions(),
    active_quotes: app._quoteCache.getActiveQuotes(),
  });

  app.serverApp.listen(port, () => {
    console.log(`[APP] Application running in http://localhost:${port} mode ${API_ENVIRONMENT}`);
  });
};

BakoSafe.setProviders({
  SERVER_URL: process.env.API_URL,
  CLIENT_URL: process.env.UI_URL,
  CHAIN_URL: process.env.API_DEFAULT_NETWORK,
});

BakoSafe.setGasConfig({
  GAS_LIMIT: Number(process.env.GAS_LIMIT) ?? 10000000,
  MAX_FEE: Number(process.env.MAX_FEE) ?? 1000000,
});

try {
  start();
} catch (e) {
  console.log(e);
}
