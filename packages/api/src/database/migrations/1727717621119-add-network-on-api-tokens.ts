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

    const provider = await Provider.create(FUEL_PROVIDER);
    const network = {
      url: provider.url,
      chainId: provider.getChainId(),
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
