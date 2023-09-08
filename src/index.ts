import 'reflect-metadata';

import App from '@src/app';

const start = async () => {
  const app = new App();
  app.init();
};

start();
