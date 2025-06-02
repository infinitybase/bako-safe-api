import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database';

export let databaseInstance: DataSource;

export async function getDatabaseInstance(): Promise<DataSource> {
  if (databaseInstance?.isInitialized) return databaseInstance;

  if (process.env.TESTCONTAINERS_DB === 'true') {
    console.log('[DATABASE]: Testcontainers mode');

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    process.env.DATABASE_HOST = container.getHost();
    process.env.DATABASE_PORT = container.getPort().toString();
    process.env.DATABASE_USERNAME = container.getUsername();
    process.env.DATABASE_PASSWORD = container.getPassword();
    process.env.DATABASE_NAME = container.getDatabase();
  }

  databaseInstance = new DataSource(getDatabaseConfig());
  return databaseInstance;
}
