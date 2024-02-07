import { generateInitialDapp } from '@mocks/initialSeeds';
import { MigrationInterface, QueryRunner } from 'typeorm';

import { DApp } from '@src/models';

export class addInitialDapp1707343991096 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await DApp.create(await generateInitialDapp()).save();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { name } = await generateInitialDapp();
    await DApp.delete({ name });
  }
}
