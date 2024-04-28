import { BakoSafe } from 'bakosafe';

import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

BakoSafe.setup({
  SERVER_URL: process.env.API_URL,
  CLIENT_URL: process.env.UI_URL,
});

try {
  start();
} catch (e) {
  console.log(e);
}
