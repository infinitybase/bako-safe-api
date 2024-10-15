import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';

import { router } from '@src/routes';
import { isDevMode, TVLCronJob } from '@src/utils';

import { handleErrors } from '@middlewares/index';
import { QuoteStorage, SessionStorage } from './storage';
import Monitoring from './monitoring';
import Bootstrap from './bootstrap';
import RedisWriteClient from '@src/utils/redis/RedisWriteClient';
import RedisReadClient from '@src/utils/redis/RedisReadClient';

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
    this.initJobs();

    this.sessionCache = SessionStorage.start();
    this.quoteCache = QuoteStorage.start();
  }

  private initMiddlewares() {
    this.app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '20mb' }));
    this.app.use(cookieParser());
    this.app.use(Express.json());
    this.app.use(cors());

    // neg -> logs em prod
    // pos -> logs em dev
    if (!isDevMode) {
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

  private initJobs() {
    const isValid = (!!isDevMode && !isDevMode) ?? false;

    // run only production
    if (isValid) {
      TVLCronJob.start();
    }
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

  static async start() {
    if (!App.instance) {
      Monitoring.init();

      await Bootstrap.start();
      await RedisWriteClient.start();
      await RedisReadClient.start();

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
