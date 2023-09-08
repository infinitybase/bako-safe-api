import dotenv from 'dotenv';
import path from 'path';
import { ConnectionOptions } from 'typeorm';

dotenv.config();

const {
  DATABASE_PASSWORD,
  DATABASE_HOST,
  DATABASE_URL,
  DATABASE_USERNAME,
  DATABASE_NAME,
  NODE_ENV,
} = process.env;

const [host, port] = String(DATABASE_URL).split(':');

const entitiesDir = path.resolve(__dirname, '..', 'models', '**', '*{.ts,.js}');
const migrationsDir = path.resolve(
  __dirname,
  '..',
  'database',
  'migrations',
  '**',
  '*.ts',
);
const seedersDir = path.resolve(
  __dirname,
  '..',
  '..',
  'database',
  'seeders',
  '**',
  '*.ts',
);

const development: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(port),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  cli: {
    entitiesDir: './src/models/',
    migrationsDir: './src/database/migrations/',
  },
  synchronize: false,
  migrationsRun: false,
};

const test: ConnectionOptions = {
  database: path.resolve(__dirname, '..', '..', '__data__', 'database.test.sqlite'),
  type: 'sqlite',
  entities: [path.resolve(__dirname, '..', 'models', '**', '*{.ts,.js}')],
  migrations: [migrationsDir, seedersDir],
  cli: {
    entitiesDir: './src/models/',
    migrationsDir: './src/database/migrations/',
  },
  synchronize: false,
  migrationsRun: true,
};

const production: ConnectionOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  cli: {
    entitiesDir: './src/models/',
    migrationsDir: './src/database/migrations/',
  },
  synchronize: false,
  migrationsRun: false,
};

const staging: ConnectionOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir],
  cli: {
    entitiesDir: './src/models/',
    migrationsDir: './src/database/migrations/',
  },
  synchronize: false,
};

const database = {
  development,
  production,
  staging,
  test,
};

export default database[NODE_ENV || 'development'];
