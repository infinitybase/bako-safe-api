import { DataSource } from 'typeorm';

import config from '../config/database';

export const databaseInstance = new DataSource(config);
