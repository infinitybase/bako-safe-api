import cors from 'cors';
import Express from 'express';
import morgan from 'morgan';
import { createConnection } from 'typeorm';

import { router } from '@src/routes';

import { handleErrors } from '@middlewares/index';

const { API_PORT } = process.env;

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
      await createConnection({
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        entities: [__dirname + '/models/**/*.ts'],
        synchronize: false,
        migrationsRun: process.env.NODE_ENV === 'production',
      });
    } catch (e) {
      console.log('[DB] Error connecting to database', e);
    }
  }

  async init() {
    // DB
    await App.connectDatabase();

    // App
    const port = API_PORT || 80;
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
