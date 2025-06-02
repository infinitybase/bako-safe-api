import dotenv from 'dotenv';
import { getDatabaseInstance } from '@src/config/connection';
// import runSeeders from '@src/database/seeders';

class Bootstrap {
  static databaseInstance;

  static startEnv() {
    const isTest = process.env.NODE_ENV === 'test' || process.env.TEST === 'true';

    // Força testcontainer se estiver rodando testes
    if (isTest && !process.env.TESTCONTAINERS_DB) {
      process.env.TESTCONTAINERS_DB = 'true';
    }

    const envFile = isTest ? '.env.test' : '.env';
    dotenv.config({ path: envFile });
  }

  static async connectDatabase() {
    const db = await getDatabaseInstance();

    await db.initialize();

    await db.runMigrations();
    // await runSeeders();

    this.databaseInstance = db;
  }

  static async closeDatabase() {
    if (this.databaseInstance?.isInitialized) {
      await this.databaseInstance.destroy();
    }
  }

  static async start() {
    this.startEnv();
    await this.connectDatabase();
  }

  static async stop() {
    await this.closeDatabase();
  }
}

export default Bootstrap;
