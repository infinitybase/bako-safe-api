import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';

import { router } from '@src/routes';
import { isDevMode } from '@src/utils';

import { handleErrors } from '@middlewares/index';
import { QuoteStorage, SessionStorage, BalanceCache, TransactionCache } from './storage';
import Monitoring from './monitoring';
import Bootstrap from './bootstrap';
import { RedisWriteClient, RedisReadClient, FuelProvider } from '@src/utils';
import { RigInstance } from './storage/rig';
import { webhookRawRouters } from '@src/modules/webhook/routes';

class App {
  private static instance?: App;

  private readonly app: Express.Application;
  private sessionCache: SessionStorage;
  private quoteCache: QuoteStorage;
  private rigCache: Promise<RigInstance>;
  private balanceCache: BalanceCache;
  private transactionCache: TransactionCache;

  protected constructor() {
    this.app = Express();
    this.app.use('/webhooks', webhookRawRouters);
    this.initMiddlewares();
    this.initRoutes();
    this.setupMonitoring();
    this.initErrorHandler();

    // if (!(process.env.TESTCONTAINERS_DB === 'true')) {
    //   this.sessionCache = SessionStorage.start();
    //   this.quoteCache = QuoteStorage.start();
    // }
    this.sessionCache = SessionStorage.start();
    this.quoteCache = QuoteStorage.start();
    this.rigCache = RigInstance.start();
    this.balanceCache = BalanceCache.start();
    this.transactionCache = TransactionCache.start();
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

  get _rigCache() {
    return this.rigCache;
  }

  get _balanceCache() {
    return this.balanceCache;
  }

  get _transactionCache() {
    return this.transactionCache;
  }

  static stop() {
    return Bootstrap.stop()
      .then(() => RedisWriteClient.stop())
      .then(() => RedisReadClient.stop())
      .then(() => FuelProvider.stop())
      .then(() => SessionStorage.stop())
      .then(() => QuoteStorage.stop())
      .then(() => RigInstance.stop())
      .then(() => BalanceCache.stop())
      .then(() => TransactionCache.stop())
      .then(() => {
        App.instance = undefined;
      })
      .catch(error => {
        console.error('[APP] Error stopping application:', error);
      });
  }

  static async start() {
    if (!App.instance) {
      Monitoring.init();

      await Bootstrap.start();
      // if (!(process.env.TESTCONTAINERS_DB === 'true')) {
      //   await RedisWriteClient.start();
      //   await RedisReadClient.start();
      // }

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
