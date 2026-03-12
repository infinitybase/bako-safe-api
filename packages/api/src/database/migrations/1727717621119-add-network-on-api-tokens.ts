import { Provider } from 'fuels';
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const { FUEL_PROVIDER } = process.env;

export class AddNetworkOnApiTokens1727717621119 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'api_tokens',
      new TableColumn({
        name: 'network',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    const provider = new Provider(FUEL_PROVIDER);
    await provider.init();
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
    await queryRunner.dropColumn('api_tokens', 'network');
  }
}
