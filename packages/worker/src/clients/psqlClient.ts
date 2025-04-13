import { Client, type QueryResult } from 'pg'

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
  private readonly client: Client
  private static instance: PsqlClient;
  protected constructor (client: Client) {
    this.client = client
  }

  static async connect (connection: ConnectionConfig = defaultConnection): Promise<PsqlClient> {
    try {
      if (!PsqlClient.instance) {
        const client = new Client(connection)
        console.log('[PSQL]: Connecting to PostgreSQL...')
        await client.connect()
        PsqlClient.instance = new PsqlClient(client)
      }
      console.log('[PSQL]: Connected to PostgreSQL successfully.')
      return PsqlClient.instance
    }catch (error) {
      console.error('[PSQL]: Error on connection', error)
      throw error
    }
  }

  async query (query: string, params?: string[]): Promise<any> {
    try {
      const { rows }: QueryResult = await this.client.query(query, params)
      if (rows.length === 1) return rows[0]
      return rows
    } catch (error) {
      console.error('[PSQL]: Error on query', error)
      throw error
    }
  }
}
