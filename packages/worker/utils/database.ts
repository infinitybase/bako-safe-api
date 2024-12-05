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

const isLocal = DATABASE_HOST && DATABASE_HOST === '127.0.0.1' 

export const defaultConnection: ConnectionConfig = {
  user: DATABASE_USERNAME ?? 'postgress',
  password: DATABASE_PASSWORD ?? 'postgress', 
  database: DATABASE_NAME ?? 'postgress',
  host: DATABASE_HOST ?? '127.0.0.1',
  port: Number(DATABASE_PORT ?? '5432'),
  // ...!isLocal && {
  ssl: {
      rejectUnauthorized: false
  }
  // },
}

export class Database {
  private readonly client: Client
  private static instance: Database;
  protected constructor (client: Client) {
    this.client = client
  }

  static async connect (connection: ConnectionConfig = defaultConnection): Promise<Database> {
    if (!Database.instance) {
      const cl = new Client(connection)
      await cl.connect();
      Database.instance = new Database(cl);
    }

    return Database.instance;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
