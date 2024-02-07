import { MigrationInterface, QueryRunner } from 'typeorm';

import { generateInitialAddressBook } from '@src/mocks/initialSeeds/initialAddressBook';
import AddressBook from '@src/models/AddressBook';

export class addInitialAdb1707343758798 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for await (const addressBook of await generateInitialAddressBook()) {
      await AddressBook.create(addressBook).save();
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for await (const addressBook of await generateInitialAddressBook()) {
      await AddressBook.delete(addressBook);
    }
  }
}
