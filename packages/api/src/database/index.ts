import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database';

/**
 * TypeORM DataSource for CLI commands (migrations, etc.)
 * This is the entry point for `typeorm` CLI operations.
 */
export default new DataSource(getDatabaseConfig());
