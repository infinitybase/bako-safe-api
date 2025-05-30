import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';

import { router } from '@src/routes';
import { isDevMode } from '@src/utils';

import { handleErrors } from '@middlewares/index';
import { QuoteStorage, SessionStorage } from './storage';
import Monitoring from './monitoring';
import Bootstrap from './bootstrap';
import { RedisWriteClient, RedisReadClient, FuelProvider } from '@src/utils';

class App {
  private static instance?: App;

  private readonly app: Express.Application;
  private sessionCache: SessionStorage;
  private quoteCache: QuoteStorage;

  protected constructor() {
    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.setupMonitoring();
    this.initErrorHandler();

    this.sessionCache = SessionStorage.start();
    this.quoteCache = QuoteStorage.start();
  }

  private initMiddlewares() {
    this.app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '20mb' }));
    this.app.use(cookieParser());
    this.app.use(Express.json());
    this.app.use(cors());

    if (isDevMode) {
      this.app.use(morgan('dev'));
    }
  }

  private initRoutes() {
    this.app.use(router);
  }

  private initErrorHandler() {
    this.app.use(handleErrors);
  }

  private setupMonitoring() {
    Monitoring.setup(this.app);
  }

  get serverApp() {
    return this.app;
  }

  get _sessionCache() {
    return this.sessionCache;
  }

  get _quoteCache() {
    return this.quoteCache;
  }

  static stop() {
    return Bootstrap.stop()
      .then(() => RedisWriteClient.stop())
      .then(() => RedisReadClient.stop())
      .then(() => FuelProvider.stop())
      .then(() => SessionStorage.stop())
      .then(() => QuoteStorage.stop())
      .then(() => {
        App.instance = undefined;
        console.log('[APP] Application stopped');
      })
      .catch(error => {
        console.error('[APP] Error stopping application:', error);
      });
  }

  static async start() {
    if (!App.instance) {
      Monitoring.init();

      await Bootstrap.start();
      await RedisWriteClient.start();
      await RedisReadClient.start();
      await FuelProvider.start();

      App.instance = new App();
      Object.freeze(App.instance);
    }

    return App.instance;
  }

  static getInstance(): App {
    if (!App.instance) {
      throw new Error('App is not started');
    }

    return App.instance;
  }
}

export default App;
