import { BakoSafe } from 'bakosafe';

import app from './app';
import Bootstrap from './bootstrap';
import { bakoProviders, bakoGasFee } from '../config/bakosafe';

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

BakoSafe.setProviders(bakoProviders);
BakoSafe.setGasConfig(bakoGasFee);

try {
  start();
} catch (e) {
  console.log(e);
}
