import 'dotenv/config';
import { Provider } from 'fuels';
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const { FUEL_PROVIDER } = process.env;

export class AddNetworkOnTransaction1727715693680 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    const provider = new Provider(FUEL_PROVIDER);
    const network = {
      url: provider.url,
      chainId: await provider.getChainId().catch(() => 0),
    };

    const networkString = JSON.stringify(network);

    await queryRunner.query(
      `UPDATE transactions SET network = $1 WHERE network IS NULL`,
      [networkString],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'network');
  }
}
