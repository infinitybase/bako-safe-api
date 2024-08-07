import { Address } from 'fuels';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAddressTypePredicate1720477253102 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const predicates = await queryRunner.query(
      `SELECT * FROM predicates p WHERE p."predicateAddress" LIKE 'fuel%'`,
    );

    for (const predicate of predicates) {
      const newAddress = Address.fromString(
        predicate.predicateAddress,
      ).toHexString();
      await queryRunner.query(
        `UPDATE predicates SET "predicateAddress" = $1 WHERE id = $2`,
        [newAddress, predicate.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
