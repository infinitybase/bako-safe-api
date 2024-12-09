import { MongoClient, type Db, type Collection, type Document, type OptionalUnlessRequiredId, type Filter, type FindOptions, type WithId } from 'mongodb';

const {
  MONGO_HOST,
  MONGO_ENVIRONMENT,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_PORT,
} = process.env;

interface MongoConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: string;
}

export enum CollectionName {
  PREDICATE_BALANCE = 'predicate_balance',
  FUEL_ASSETS = 'fuel_assets',
}

export interface SchemaFuelAssets extends Document {
  _id: string; // asset id
  name: string;
  symbol: string;
  decimals: number;
  verified: boolean;
  isNFT: boolean;
}


export interface SchemaPredicateBalance extends Document {
  tx_id: string;
  amount: number;
  assetId: string;
  usdValue: number;
  predicate: string;
  createdAt: Date;
  verifiedToken: boolean;
  isDeposit: boolean;
}


export const defaultMongoConnection: MongoConnectionConfig = {
  host: MONGO_HOST ?? '127.0.0.1',
  port: Number(MONGO_PORT ?? '27017'),
  username: MONGO_USERNAME,
  password: MONGO_PASSWORD,
  database: MONGO_ENVIRONMENT ?? 'test',
};

export class MongoDatabase {
  private static instance: MongoDatabase;
  private client: MongoClient;
  private db: Db;

  private constructor(client: MongoClient, db: Db) {
    this.client = client;
    this.db = db;
  }

  static async connect(
    connection: MongoConnectionConfig = defaultMongoConnection
  ): Promise<MongoDatabase> {
    if (!MongoDatabase.instance) {
      const uri = connection.username && connection.password
        ? `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}`
        : `mongodb://${connection.host}:${connection.port}`;
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db(connection.database);
      MongoDatabase.instance = new MongoDatabase(client, db);
    }
    return MongoDatabase.instance;
  }

  getCollection<T extends Document>(collectionName: string): Collection<T> {
    return this.db.collection<T>(collectionName);
  }

  async find<T extends Document>(
    collectionName: string,
    query: Filter<T> = {}, // Filtro para busca
    projection: FindOptions<T> = {} // Projeções ou outras opções
  ): Promise<WithId<T>[]> {
    try {
      const collection = this.getCollection<T>(collectionName);
      return await collection.find(query, projection).toArray();
    } catch (error) {
      console.error('Error executing find query:', error);
      throw error;
    }
  }


  async insertOne<T extends Document>(
    collectionName: string,
    document: OptionalUnlessRequiredId<T>
  ): Promise<void> {
    try {
      const collection = this.getCollection<T>(collectionName);
      await collection.insertOne(document);
    } catch (error) {
      console.error('Error inserting document:', error);
      throw error;
    }
  }
}
