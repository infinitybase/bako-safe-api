// eslint-disable-next-line prettier/prettier
import { Client, type QueryResult } from 'pg'

const {
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_DATABASE,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USERNAME
} = process.env

interface ConnectionConfig {
  user: string
  password: string
  database: string
  host: string
  port: number
}

export const defaultConnection: ConnectionConfig = {
  user: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
}

export class DatabaseClass {
  private readonly client: Client
  protected constructor (client: Client) {
    this.client = client
  }

  static async connect (connection: ConnectionConfig = defaultConnection): Promise<DatabaseClass> {
    const cl = new Client(connection)
    await cl.connect()
    return new DatabaseClass(cl)
  }

  async query (query: string): Promise<any> {
    try {
      const { rows }: QueryResult = await this.client.query(query)
      if (rows.length === 1) return rows[0]
      return rows
    } catch (error) {
      console.error('Erro ao executar a query:', error)
      throw error
    }
  }
}
