import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

const colType = new TableColumn({
  name: 'type',
  type: 'varchar',
  isNullable: false,
});

const colWorkspace = new TableColumn({
  name: 'w_owner',
  type: 'uuid',
  isNullable: true,
});

const colUser = new TableColumn({
  name: 'p_owner',
  type: 'uuid',
  isNullable: true,
});

const oldFK = new TableForeignKey({
  name: 'FK-contact-created_by',
  columnNames: ['created_by'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'CASCADE',
});

const fkWorkspaceAddressBook = new TableForeignKey({
  name: 'FK-workspace-address_book',
  columnNames: ['w_owner'],
  referencedColumnNames: ['id'],
  referencedTableName: 'workspace',
  onDelete: 'CASCADE',
});

const fkWorkspaceUser = new TableForeignKey({
  name: 'FK-user-address_book',
  columnNames: ['p_owner'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'CASCADE',
});

export class changeAddressBookAddPk1703083669692 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('address_book', oldFK);
    await queryRunner.dropColumn('address_book', 'created_by');

    await queryRunner.addColumn('address_book', colType);
    await queryRunner.addColumn('address_book', colWorkspace);
    await queryRunner.createForeignKey('address_book', fkWorkspaceAddressBook);
    await queryRunner.addColumn('address_book', colUser);
    await queryRunner.createForeignKey('address_book', fkWorkspaceUser);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('address_book', fkWorkspaceUser);
    await queryRunner.dropColumn('address_book', colUser);
    await queryRunner.dropForeignKey('address_book', fkWorkspaceAddressBook);
    await queryRunner.dropColumn('address_book', colWorkspace);
    await queryRunner.dropColumn('address_book', colType);

    await queryRunner.addColumn('address_book', colUser);
    await queryRunner.createForeignKey('address_book', oldFK);
  }
}
