// eslint-disable-next-line prettier/prettier
import { Client, type QueryResult } from 'pg'

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  DATABASE_NAME
} = process.env

interface ConnectionConfig {
  user: string
  password: string
  database: string
  host: string
  port: number
  ssl: {
    rejectUnauthorized: boolean
  };
}

const isLocal = DATABASE_HOST === '127.0.0.1'

export const defaultConnection: ConnectionConfig = {
  user: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  ...!isLocal && {
    ssl: {
      rejectUnauthorized: false
    }
  },
}

export class DatabaseClass {
  private readonly client: Client
  private static instance: DatabaseClass;
  protected constructor (client: Client) {
    this.client = client
  }

  static async connect (connection: ConnectionConfig = defaultConnection): Promise<DatabaseClass> {
    console.log('[CONNECT_DATABASE]: ', defaultConnection)
    if (!this.instance) {
      const cl = new Client(connection)
      await cl.connect();
      this.instance = new DatabaseClass(cl);
    }

    return this.instance;
  }

  async query (query: string, params?: string[]): Promise<any> {
    try {
      const { rows }: QueryResult = await this.client.query(query, params)
      if (rows.length === 1) return rows[0]
      return rows
    } catch (error) {
      console.error('Erro ao executar a query:', error)
      throw error
    }
  }
}
