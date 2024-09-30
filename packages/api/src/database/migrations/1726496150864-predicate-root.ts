import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class PredicateRoot1726496150864 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('predicates', new TableColumn({
            name: 'root',
            type: 'boolean',
            default: false, 
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('predicates', 'root');
    }

}
