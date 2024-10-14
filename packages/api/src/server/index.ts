import * as pprof from 'pprof';

import App from './app';

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
  AWS_SMTP_PASS,
  REDIS_URL,
  REDIS_URL_WRITE,
  REDIS_URL_READ,
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
    AWS_SMTP_PASS,
    REDIS_URL,
    REDIS_URL_WRITE,
    REDIS_URL_READ,
  });

  const app = await App.start();

  console.log('[APP] Storages started');

  app.serverApp.listen(port, () => {
    console.log(
      `[APP] Application running in http://localhost:${port} mode ${API_ENVIRONMENT}`,
    );
  });
};

try {
  start();
} catch (e) {
  console.log(e);
}
