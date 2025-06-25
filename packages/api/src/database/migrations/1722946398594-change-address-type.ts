import { MigrationInterface, QueryRunner } from 'typeorm';
import { Address } from 'fuels';

export class ChangeAddressType1722946398594 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.query(
      `SELECT * FROM users WHERE address LIKE 'fuel%'`,
    );
    for (const user of users) {
      const newAddress = Address.fromString(user.address).toHexString();

      const handleExists = await queryRunner.query(
        `SELECT id FROM users WHERE address = $1`,
        [newAddress],
      );

      if (handleExists.length === 0) {
        await queryRunner.query(`UPDATE users SET address = $1 WHERE id = $2`, [
          newAddress,
          user.id,
        ]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
