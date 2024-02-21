import { BSafe } from 'bsafe';

import { DiscordUtils } from '@src/utils';

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

if (process.env.NODE_ENV === 'production') {
  App.pm2HandleServerStop();
  App.serverHooks({
    onServerStart: () => DiscordUtils.sendStartMessage(),
    onServerStop: error =>
      DiscordUtils.sendErrorMessage({
        name: error.data?.name,
        stack: error.data?.stack,
        message: error.data?.message,
      }),
  });
}

try {
  start();
} catch (e) {
  console.log(e);
}
