import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database';

export let databaseInstance: DataSource;

/**
 * Configura e retorna a instância `DataSource`, com suporte a testcontainers.
 * Obs: não inicializa automaticamente — quem faz isso é o Bootstrap.
 */
export async function getDatabaseInstance(): Promise<DataSource> {
  if (databaseInstance?.isInitialized) return databaseInstance;
  console.log(
    '[DATABASE]: Iniciando conexão com o banco de dados',
    process.env.TESTCONTAINERS_DB === 'true',
    process.env.TESTCONTAINERS_DB,
  );
  // Testcontainers só configura variáveis de ambiente
  if (process.env.TESTCONTAINERS_DB === 'true') {
    console.log('[DATABASE]: Testcontainers mode ativo');

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    // console.log(container);

    process.env.DATABASE_HOST = container.getHost();
    process.env.DATABASE_PORT = container.getPort().toString();
    process.env.DATABASE_USERNAME = container.getUsername();
    process.env.DATABASE_PASSWORD = container.getPassword();
    process.env.DATABASE_NAME = container.getDatabase();

    console.log('[DATABASE]: Container iniciado em', {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
  }

  databaseInstance = new DataSource(getDatabaseConfig());
  return databaseInstance;
}
