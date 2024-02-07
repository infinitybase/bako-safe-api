import { MigrationInterface, QueryRunner } from 'typeorm';

import {
  generateInitialWorkspace,
  generateInitialAuxWorkspace,
} from '@src/mocks/initialSeeds/initialWorkspace';
import { Workspace } from '@src/models/Workspace';

export class addInitialWorkspace1707343603602 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await (await generateInitialWorkspace()).save();
    await (await generateInitialAuxWorkspace()).save();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { name } = await generateInitialWorkspace();
    const { name: auxName } = await generateInitialAuxWorkspace();
    await Workspace.delete({ name });
    await Workspace.delete({ name: auxName });
  }
}
