import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

const defaultVaultCol = new TableColumn({
  name: 'default_vault',
  type: 'uuid',
  isNullable: true,
});

const fkUserDefaultVault = new TableForeignKey({
  name: 'FK-users-default-vault-predicates',
  columnNames: ['default_vault'],
  referencedTableName: 'predicates',
  referencedColumnNames: ['id'],
  onDelete: 'CASCADE',
});

export class AddDefaultVaultColumnToUser1725993495296
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', defaultVaultCol);
    await queryRunner.createForeignKey('users', fkUserDefaultVault);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('users', fkUserDefaultVault);
    await queryRunner.dropColumn('users', defaultVaultCol);
  }
}
