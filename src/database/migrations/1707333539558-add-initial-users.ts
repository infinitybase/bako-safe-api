import { MigrationInterface, QueryRunner } from 'typeorm';

import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';
import { User } from '@src/models/User';

const queryInsert = (table: string, keys: string[], values: any[]) => {
  const format = (string: string) => {
    return string.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  };
  return {
    query: `INSERT INTO ${table} (${keys
      .map(k => format(k))
      .join(', ')}) VALUES (${values
      .map((_, index) => `$${index + 1}`)
      .join(', ')}) RETURNING id`,
    values,
  };
};

export class addInitialUsers1707333539558 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await generateInitialUsers();
    for (const user of users) {
      await User.create(user).save();
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Array de nomes dos usuários a serem removidos
    // eslint-disable-next-line
    const { name }: any = await generateInitialUsers(); // Exemplo, substitua pelos nomes reais

    await User.delete({
      name,
    });
  }
}
