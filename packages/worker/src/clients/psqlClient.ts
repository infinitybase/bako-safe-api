import { Pool, type QueryResult } from 'pg'

const {
  WORKER_DATABASE_HOST,
  WORKER_DATABASE_PORT,
  WORKER_DATABASE_USERNAME,
  WORKER_DATABASE_PASSWORD,
  WORKER_DATABASE_NAME
} = process.env

interface ConnectionConfig {
  user?: string
  password?: string
  database?: string
  host?: string
  port?: number
  ssl?: {
    rejectUnauthorized: boolean
  };
}

const isLocal = WORKER_DATABASE_HOST ? WORKER_DATABASE_HOST === '127.0.0.1' : true

export const defaultConnection: ConnectionConfig = {
  user: WORKER_DATABASE_USERNAME,
  password: WORKER_DATABASE_PASSWORD,
  database: WORKER_DATABASE_NAME,
  host: WORKER_DATABASE_HOST,
  port: Number(WORKER_DATABASE_PORT),
  ...!isLocal && {
    ssl: {
      rejectUnauthorized: false
    }
  },
}

export class PsqlClient {
  private static pool: Pool;

  static async connect(connection: ConnectionConfig = defaultConnection): Promise<Pool> {
    if (!PsqlClient.pool) {
      PsqlClient.pool = new Pool(connection);
      console.log('[PSQL]: Connecting to PostgreSQL...');
      console.log('[PSQL]: Connected to PostgreSQL successfully.');
    }
    return PsqlClient.pool;
  }

  async query(query: string, params?: string[]): Promise<any> {
    try {
      if (!PsqlClient.pool) {
        await PsqlClient.connect();
      }
      const { rows }: QueryResult = await PsqlClient.pool.query(query, params);
      return rows.length === 1 ? rows[0] : rows;
    } catch (error) {
      console.error('[PSQL]: Error on query', error)
      throw error
    }
  }
}
