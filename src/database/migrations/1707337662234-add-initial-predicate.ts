import { MigrationInterface, QueryRunner } from 'typeorm';

import { generateInitialPredicate } from '@src/mocks/initialSeeds/initialPredicate';

const queryInsert = (
  table: string,
  keys: string[],
  values: any[],
  return_id: boolean,
) => {
  const format = (string: string) => {
    return string.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  };
  return {
    query: `INSERT INTO ${table} (${keys
      .map(k => format(k))
      .join(', ')}) VALUES (${values
      .map((_, index) => `$${index + 1}`)
      .join(', ')}) ${return_id ? 'RETURNING id' : ''}`,
    values,
  };
};

export class addInitialPredicate1707337662234 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const { members, owner, ...rest } = await generateInitialPredicate();

    //add owner_id to rest
    rest['owner_id'] = owner.id;

    const { query, values } = queryInsert(
      'predicates',
      Object.keys(rest),
      Object.values(rest),
      true,
    );

    //aways returned on array
    const id_predicate = await queryRunner.query(query, values).then(res => res[0]);

    //add member on relation predicate_members
    for await (const member of members) {
      const param = {
        predicate_id: id_predicate.id,
        user_id: member.id,
      };
      const { query: user_query, values: values_query } = queryInsert(
        'predicate_members',
        Object.keys(param),
        Object.values(param),
        false,
      );
      await queryRunner.query(user_query, values_query);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { name } = await generateInitialPredicate();
    const predicate = await queryRunner
      .query(`SELECT id FROM predicates WHERE name = '${name}'`)
      .then(res => res[0].id);

    await queryRunner.query(`DELETE FROM predicates WHERE id = '${predicate}';
    DELETE FROM predicate_members WHERE predicate_id = '${predicate}';`);
  }
}
