import { logger } from '@src/config/logger';
import { RedisReadClient } from '@src/utils/redis/RedisReadClient';
import { RedisWriteClient } from '@src/utils/redis/RedisWriteClient';
import { getDatabaseInstance } from '@src/config/connection';
import { IHealthCheckResponse, IHealthCheckService } from './types';

export class HealthCheckService implements IHealthCheckService {
  /**
   * Check database connectivity by executing a minimal query
   */
  async checkDatabase(): Promise<IHealthCheckResponse> {
    try {
      const dataSource = await getDatabaseInstance();

      if (!dataSource || !dataSource.isInitialized) {
        logger.error({}, '[HEALTH_CHECK_DATABASE] Database not initialized');
        throw new Error('Database not initialized');
      }

      await dataSource.query('SELECT 1');

      return { status: 'ok' };
    } catch (error) {
      logger.error({ error }, '[HEALTH_CHECK_DATABASE]');
      throw error;
    }
  }

  /**
   * Check Redis connectivity by executing PING on both read and write clients
   */
  async checkRedis(): Promise<IHealthCheckResponse> {
    try {
      await Promise.all([RedisReadClient.ping(), RedisWriteClient.ping()]);

      return { status: 'ok' };
    } catch (error) {
      logger.error({ error }, '[HEALTH_CHECK_REDIS]');
      throw error;
    }
  }
}
