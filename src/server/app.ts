import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';

import { router } from '@src/routes';

import { handleErrors } from '@middlewares/index';

const { API_PORT, PORT } = process.env;

class App {
  private readonly app: Express.Application;

  constructor() {
    this.app = Express();

    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();
  }

  async init() {
    // App
    const port = API_PORT || PORT || 80;
    console.log('[APP] Starting application.');
    this.app.listen(port, () => {
      console.log(`[APP] Application running in http://localhost:${port}`);
    });
  }

  private initMiddlewares() {
    this.app.use(bodyParser.urlencoded({ limit: '100mb', extended: false }));
    this.app.use(bodyParser.json({ limit: '100mb' }));
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

  get serverApp() {
    return this.app;
  }
}

export default App;
