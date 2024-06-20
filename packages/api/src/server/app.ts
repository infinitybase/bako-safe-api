import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';  

import { router } from '@src/routes';
import { TVLCronJob } from '@src/utils';

import { handleErrors } from '@middlewares/index';
import { SessionStorage } from './storage';


class App {
  private readonly app: Express.Application;
  private sessionCache: SessionStorage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  constructor() {
    const isDevmode = process.env.NODE_ENV === 'development';

    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();
    
    isDevmode && this.initCronJobs();
    
    this.sessionCache = new SessionStorage();
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
  get _sessionCache() {
    return this.sessionCache;
  }
}

const app = new App();

Object.freeze(app);

export default app;
