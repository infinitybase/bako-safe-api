import { MigrationInterface, QueryRunner } from "typeorm";
import { Address } from "fuels";

export class ChangeAddressType1720476154663 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const users = await queryRunner.query(
            `SELECT * FROM users WHERE address LIKE 'fuel%'`
        );
        console.log(users.length)
        for (const user of users) {
            const newAddress = Address.fromString(user.address).toHexString();
            console.log(newAddress, user.id)
            await queryRunner.query(
                `UPDATE users SET address = $1 WHERE id = $2`,
                [newAddress, user.id]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return;
    }
}