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

const { API_PORT, PORT } = process.env;

class App {
  private readonly app: Express.Application;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpServer!: any;

  constructor() {
    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();
    // this.initCronJobs();
  }

  async init() {
    // App
    const port = API_PORT || PORT || 3333;
    console.log('[APP] Starting application.');
    this.httpServer = http.createServer(this.app);
    this.httpServer.listen(port, () => {
      console.log(`[APP] Application running in http://localhost:${port}`);
    });
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
