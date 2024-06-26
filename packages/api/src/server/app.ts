import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';

import { router } from '@src/routes';
import { TVLCronJob } from '@src/utils';

import { handleErrors } from '@middlewares/index';
import { QuoteStorage, SessionStorage } from './storage';
const { NODE_ENV } = process.env;

class App {
  private readonly app: Express.Application;
  private readonly isDevMode: boolean;
  private sessionCache: SessionStorage;
  private quoteCache: QuoteStorage;

  constructor() {
    this.isDevMode = NODE_ENV === 'development';

    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();

    this.isDevMode && this.initCronJobs();

    this.sessionCache = new SessionStorage();
    this.quoteCache = new QuoteStorage();

    this.initQuotesJob();
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

  private initQuotesJob() {
    if (this.isDevMode) {
      this._quoteCache.startDev();
    } else {
      this._quoteCache.start();
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
}

const app = new App();

Object.freeze(app);

export default app;
