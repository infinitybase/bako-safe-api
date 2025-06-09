import 'reflect-metadata';
// import * as pprof from 'pprof';
import './tracing';
import App from './app';

const start = async () => {
  const app = await App.start();
  const port = process.env.API_PORT || process.env.PORT || 3000;
  const API_ENVIRONMENT = process.env.API_ENVIRONMENT || 'development';

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
