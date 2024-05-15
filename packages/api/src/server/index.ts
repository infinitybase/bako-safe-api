import { BakoSafe } from 'bakosafe';

import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

BakoSafe.setProviders({
  SERVER_URL: process.env.API_URL,
  CLIENT_URL: process.env.UI_URL,
  CHAIN_URL: process.env.API_DEFAULT_NETWORK,
});

BakoSafe.setGasConfig({
  GAS_LIMIT: Number(process.env.GAS_LIMIT) ?? 1000000,
  GAS_PRICE: Number(process.env.GAS_PRICE) ?? 1,
});

try {
  start();
} catch (e) {
  console.log(e);
}
