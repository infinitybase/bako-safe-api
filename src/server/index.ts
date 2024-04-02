import { BSafe } from 'bako-safe';

import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

BSafe.setup({
  API_URL: process.env.API_URL,
  BSAFE_URL: process.env.UI_URL,
});

try {
  start();
} catch (e) {
  console.log(e);
}
