import { MongoClient, type Db, type Collection, type Document, type OptionalUnlessRequiredId, type Filter, type FindOptions, type WithId, ServerApiVersion } from 'mongodb';

const {
  WORKER_MONGO_HOST,
  WORKER_MONGO_ENVIRONMENT,
  WORKER_MONGO_USERNAME,
  WORKER_MONGO_PASSWORD,
  WORKER_MONGO_PORT,
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
  PREDICATE_BLOCKS = 'predicate_blocks',
  FUEL_ASSETS = 'fuel_assets',
  ASSET_BALANCE = 'asset_balance',
}

export interface SchemaAssetBalance extends Document {
  _id: string; // asset id
  usdValue: number;
  createdAt: Date;
}

export interface SchemaPredicateBlocks extends Document {
  blockNumber: number;
  timestamp: number;
  transactions: number;
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
  formatedAmount: number;
  assetId: string;
  usdValue: number;
  predicate: string;
  createdAt: Date;
  verifiedToken: boolean;
  isDeposit: boolean;
}

const HOST_LOCAL = '127.0.0.1'

export const defaultMongoConnection: MongoConnectionConfig = {
  host: WORKER_MONGO_HOST ?? '127.0.0.1',
  port: Number(WORKER_MONGO_PORT ?? '27017'),
  username: WORKER_MONGO_USERNAME,
  password: WORKER_MONGO_PASSWORD,
  database: WORKER_MONGO_ENVIRONMENT ?? 'test',
};

const urlConnection = () => {
  const connection = defaultMongoConnection;
  const uri_atlas = connection.username && connection.password
  ? `mongodb+srv://${connection.username}:${connection.password}@${connection.host}/${connection.database}?retryWrites=true&w=majority`
  : `mongodb+srv://${connection.host}/${connection.database}?retryWrites=true&w=majority`;

  const uri_local = connection.username && connection.password
  ? `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}`
  : `mongodb://${connection.host}:${connection.port}`;


  const isLocalhost = connection.host === HOST_LOCAL;

  const options = {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    ...(isLocalhost ? {} : { tls: true }) // Adiciona TLS apenas para conexões não locais
  };

  return {
    uri: isLocalhost ? uri_local : uri_atlas,
    options
  };
}

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
      const {uri, options} = urlConnection();

      const client = new MongoClient(uri, options);
  
      try {
        await client.connect();
        console.log('[MONGO_DB]: Connected to MongoDB successfully.');
        const db = client.db(connection.database);
        MongoDatabase.instance = new MongoDatabase(client, db);
      } catch (error) {
        console.error('[MONGO_BD]: Error on connecting:', error);
        throw error;
      }
    }
    return MongoDatabase.instance;
  }
  

  getCollection<T extends Document>(collectionName: string): Collection<T> {
    return this.db.collection<T>(collectionName);
  }

  async find<T extends Document>(
    collectionName: string,
    query: Filter<T> = {},
    projection: FindOptions<T> = {}
  ): Promise<WithId<T>[]> {
    try {
      const collection = this.getCollection<T>(collectionName);
      return await collection.find(query, projection).toArray();
    } catch (error) {
      console.log('[MONGO_DB]: Error executing find query:', error);
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
      // console.error('Error inserting document:', error);
      console.log('[MONGO_DB]: Error inserting document:', error);
      throw error;
    }
  }
}
