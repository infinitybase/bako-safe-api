import { MigrationInterface, QueryRunner } from 'typeorm';

import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';

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
      // Insere o usuário
      const { query, values } = queryInsert(
        'users',
        Object.keys(user),
        Object.values(user),
      );
      await queryRunner.query(query, values);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Array de nomes dos usuários a serem removidos
    const user_id = (await generateInitialUsers()).map(item => item.id); // Exemplo, substitua pelos nomes reais

    // Converter o array de nomes para uma string para uso em SQL
    const usersToRemove = user_id.map(id => `'${id}'`).join(',');

    if (usersToRemove.length > 0) {
      await queryRunner.query(`DELETE FROM user WHERE id IN (${usersToRemove})`);
    }
  }
}
