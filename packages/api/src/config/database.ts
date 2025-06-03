// @ts-nocheck

/**
 * database.config.ts
 *
 * Defines and exports the TypeORM configuration dynamically based on the current environment.
 * Loads environment variables using dotenv and maps each environment to a different config.
 *
 * Features:
 * - Supports multiple environments: development, test, staging, production, etc.
 * - Loads entity and migration paths dynamically based on build/runtime.
 * - Adds SSL support in non-development environments.
 */

import path from 'node:path';
import dotenv from 'dotenv';
import type { DataSourceOptions } from 'typeorm';

dotenv.config();

const environment = process.env.API_ENVIRONMENT ?? 'development';
const isCompiled = __dirname.includes('build');
const srcOrDist = isCompiled ? 'build' : 'src';

const resolvePath = (...segments: string[]) =>
  path.join(process.cwd(), srcOrDist, ...segments);

// Caminhos dinâmicos para entities e migrations
const entitiesDir = resolvePath('models', '**', '*.{js,ts}');
export const migrationsDir = resolvePath(
  'database',
  'migrations',
  '**',
  '*.{js,ts}',
);
export const seedersDir = resolvePath('database', 'seeders', '**', '*.{js,ts}');

export function getDatabaseConfig(): DataSourceOptions {
  const {
    DATABASE_TYPE = 'postgres',
    DATABASE_PASSWORD = 'postgres',
    DATABASE_HOST = 'localhost',
    DATABASE_USERNAME = 'postgres',
    DATABASE_NAME = 'postgres',
    DATABASE_PORT = '5432',
  } = process.env;

  const commonConfig: DataSourceOptions = {
    type: DATABASE_TYPE,
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

  const withSSL: DataSourceOptions = {
    ...commonConfig,
    ssl: {
      rejectUnauthorized: false,
    },
  };

  const configByEnv: Record<string, DataSourceOptions> = {
    development: commonConfig,
    test: commonConfig,
    production: withSSL,
    homologation: withSSL,
    staging: withSSL,
  };

  const selectedConfig = configByEnv[environment] ?? commonConfig;

  return selectedConfig;
}
