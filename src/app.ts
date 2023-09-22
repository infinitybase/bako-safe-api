import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';
import { createConnection } from 'typeorm';

import { router } from '@src/routes';

import database from '@config/database';

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

  static async connectDatabase() {
    try {
      await createConnection(database);
    } catch (e) {
      console.log('[DB] Error connecting to database', e);
    }
  }

  async init() {
    // DB
    await App.connectDatabase();

    // App
    const port = API_PORT || PORT || 80;
    console.log('[APP] Starting application.');
    this.app.listen(port, () => {
      console.log(`[APP] Application running in http://localhost:${port}`);
    });
  }

  private initMiddlewares() {
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
