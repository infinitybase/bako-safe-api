import dotenv from 'dotenv';
import { getConnection } from 'typeorm';

import startConnection from '@database/connection';
import runSeeders from '@database/seeders';

class Bootstrap {
  static async connectDatabase() {
    return await startConnection();
  }

  static startEnv() {
    dotenv.config();
  }

  static async start() {
    const {
      DATABASE_HOST,
      DATABASE_PORT,
      DATABASE_USERNAME,
      DATABASE_PASSWORD,
      DATABASE_NAME,
      NODE_ENV,
    } = process.env;

    // console.log('[DATABASE CONST]: ', {
    //   DATABASE_HOST,
    //   DATABASE_PORT,
    //   DATABASE_USERNAME,
    //   DATABASE_PASSWORD,
    //   DATABASE_NAME,
    //   NODE_ENV,
    // });

    this.startEnv();
    await this.connectDatabase();
    const isTest = NODE_ENV === 'test';

    isTest && (await getConnection().runMigrations());

    !isTest && (await this.runSeeders());
  }

  static async clearAllEntities() {
    const entities = getConnection().entityMetadatas;

    for (const entity of entities) {
      const connection = getConnection()
        .createQueryBuilder()
        .delete()
        .from(entity.name);

      await connection.execute();
      const repository = await getConnection().getRepository(entity.name); // Get repository
      await repository.clear();
    }
  }

  static async runSeeders() {
    await runSeeders();
  }
}

export default Bootstrap;
