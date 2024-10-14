import dotenv from 'dotenv';
import path from 'path';
import { ConnectionOptions } from 'typeorm';

dotenv.config();

const {
  DATABASE_PASSWORD,
  DATABASE_HOST,
  DATABASE_USERNAME,
  DATABASE_NAME,
  DATABASE_PORT,
  API_ENVIRONMENT,
} = process.env;

const environment: string = API_ENVIRONMENT;
const entitiesDir = path.resolve(__dirname, '..', 'models', '**', '*{.ts,.js}');

export const migrationsDir = path.resolve(
  __dirname,
  '..',
  'database',
  'migrations',
  '**',
  '*{.ts,.js}',
);
export const seedersDir = path.resolve(
  __dirname,
  '..',
  '..',
  'database',
  'seeders',
  '**',
  '*{.ts,.js}',
);

const development: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  synchronize: false,
  migrationsRun: true,
};

const test: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
  migrationsRun: true,
};

const production: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
  migrationsRun: true,
};

const staging: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
  migrationsRun: true,
};

const homologation: ConnectionOptions = {
  type: 'postgres',
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  entities: [entitiesDir],
  migrations: [migrationsDir, seedersDir],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
  migrationsRun: true,
};

const database = {
  development,
  production,
  staging,
  test,
  homologation,
};

export default database[environment || 'development'];
