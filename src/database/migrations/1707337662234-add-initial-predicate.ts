import { MigrationInterface, QueryRunner } from 'typeorm';

import { generateInitialPredicate } from '@src/mocks/initialSeeds/initialPredicate';
import { Predicate } from '@src/models/Predicate';

export class addInitialPredicate1707337662234 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await Predicate.create(await generateInitialPredicate()).save();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { name } = await generateInitialPredicate();
    await Predicate.delete({ name });
  }
}
