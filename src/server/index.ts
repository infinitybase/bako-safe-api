import { BSafe } from 'bsafe';

import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

BSafe.setup({
  api_url: process.env.API_URL,
  bsafe_url: process.env.UI_URL,
});

try {
  start();
} catch (e) {
  console.log(e);
}
