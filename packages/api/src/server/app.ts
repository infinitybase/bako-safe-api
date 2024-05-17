import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import http from 'http';
import morgan from 'morgan';
import pm2 from 'pm2';
import process from 'process';

import { router } from '@src/routes';
import { Callback, TVLCronJob } from '@src/utils';

import { handleErrors } from '@middlewares/index';

import SocketIOServer from '../socket/socket';

const { API_PORT, PORT } = process.env;

type ServerHooks = {
  onServerStart?: Callback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onServerStop?: Callback<any>;
};

class App {
  static hooks: ServerHooks = {};
  private readonly app: Express.Application;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpServer!: any;

  constructor() {
    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();
    this.initCronJobs();
  }

  static serverHooks(handles: ServerHooks) {
    this.hooks = handles;
  }

  static pm2HandleServerStop() {
    pm2.launchBus((err, bus) => {
      if (err) {
        console.error('[APP] Error on start PM2 bus.');
        return;
      }

      console.error('[APP] PM2 bus started.');

      bus.on('process:exception', async packet => {
        await App.hooks.onServerStop?.(packet);
        process.exit(1);
      });
    });
  }

  async init() {
    // App
    const port = API_PORT || PORT || 3333;
    console.log('[APP] Starting application.');
    this.httpServer = http.createServer(this.app);
    this.httpServer.listen(port, () => {
      console.log(`[APP] Application running in http://localhost:${port}`);
      App.hooks.onServerStart?.();
    });

    new SocketIOServer(this.httpServer);
  }

  private initMiddlewares() {
    this.app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '20mb' }));
    this.app.use(cookieParser());
    this.app.use(Express.json());
    this.app.use(cors());
    this.app.use(morgan('dev'));
  }

  private initRoutes() {
    this.app.use(router);
  }

  private initErrorHandler() {
    this.app.use(handleErrors);
  }

  private initCronJobs() {
    TVLCronJob.start();
  }

  get serverApp() {
    return this.app;
  }
}

export default App;
