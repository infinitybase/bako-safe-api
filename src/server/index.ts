import { DiscordUtils } from '@src/utils';

import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

App.startPm2Handle(error =>
  DiscordUtils.sendErrorMessage({
    name: error.data?.name,
    stack: error.data?.stack,
    message: error.data?.message,
  }),
);

try {
  start();
} catch (e) {
  console.log(e);
}
