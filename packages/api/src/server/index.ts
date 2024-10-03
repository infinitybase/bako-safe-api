import * as pprof from 'pprof';

import app from './app';
import Bootstrap from './bootstrap';

const { 
  API_PORT,
  PORT, 
  API_ENVIRONMENT, 
  UI_URL, 
  API_URL, 
  FUEL_PROVIDER, 
  GAS_LIMIT, 
  MAX_FEE,
  COIN_MARKET_CAP_API_KEY,
  AWS_SMTP_USER,
  AWS_SMTP_PASS
} = process.env;

pprof.heap.start(512 * 1024, 64);

const start = async () => {
  const port = API_PORT || PORT || 3333;


  console.log('[ENVIRONMENTS]: ', {
    API_PORT,
    PORT,
    API_ENVIRONMENT,
    UI_URL,
    API_URL,
    FUEL_PROVIDER,
    GAS_LIMIT,
    MAX_FEE,
    COIN_MARKET_CAP_API_KEY,
    AWS_SMTP_USER,
    AWS_SMTP_PASS
  })


  await Bootstrap.start();

  console.log('[APP] Storages started', {
    active_sessions: app._sessionCache.getActiveSessions(),
    active_quotes: app._quoteCache.getActiveQuotes(),
  });

  app.serverApp.listen(port, () => {
    console.log(`[APP] Application running in http://localhost:${port} mode ${API_ENVIRONMENT}`);
  });
};

try {
  start();
} catch (e) {
  console.log(e);
}
