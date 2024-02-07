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
    this.startEnv();
    await this.connectDatabase();
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
}

export default Bootstrap;
