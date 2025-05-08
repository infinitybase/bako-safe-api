import dotenv from 'dotenv';

import { databaseInstance } from '@src/database/connection';
// import runSeeders from '@src/database/seeders';

class Bootstrap {
  static async connectDatabase() {
    await databaseInstance.initialize();
    await databaseInstance.runMigrations();
    // await runSeeders();
  }

  static async closeDatabase() {
    if (databaseInstance.isInitialized) {
      await databaseInstance.destroy();
    }
  }

  static startEnv() {
    dotenv.config();
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
