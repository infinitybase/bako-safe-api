import { RedisReadClient } from '@src/utils/redis/RedisReadClient';
import { logger } from '@src/config/logger';
import { RedisWriteClient } from '@src/utils/redis/RedisWriteClient';

/**
 * Cache configuration for Balance Cache feature
 * All values are configurable via environment variables
 */

export const cacheConfig = {
  // Feature flags
  enabled: process.env.ENABLE_BALANCE_CACHE !== 'false', // enabled by default

  // Cache TTL in seconds (default: 5 minutes)
  ttl: parseInt(process.env.BALANCE_CACHE_TTL || '300', 10),

  // Invalidation flag TTL in seconds (default: 1 hour)
  invalidationFlagTtl: parseInt(process.env.BALANCE_INVALIDATION_TTL || '3600', 10),

  // Warm-up configuration
  warmup: {
    enabled: process.env.WARMUP_ENABLED !== 'false', // enabled by default
    concurrency: parseInt(process.env.WARMUP_CONCURRENCY || '5', 10),
    maxPredicates: parseInt(process.env.WARMUP_MAX_PREDICATES || '20', 10), // Limit predicates per warmup
    skipIfCached: process.env.WARMUP_SKIP_CACHED !== 'false', // Skip if already cached
  },

  // Redis key prefixes
  prefixes: {
    balance: 'balance',
    invalidated: 'balance:invalidated',
    metrics: 'cache:metrics',
  },
};

const METRICS_KEY = cacheConfig.prefixes.metrics;

/**
 * Cache metrics singleton for monitoring cache performance
 * Stores metrics in Redis for persistence across restarts and memory efficiency
 */
class CacheMetricsClass {
  private startTime = Date.now();

  /**
   * Increment a metric field in Redis
   */
  private async increment(field: string, count = 1): Promise<void> {
    try {
      const current = await RedisReadClient.get(`${METRICS_KEY}:${field}`);
      const newValue = (parseInt(current || '0', 10) + count).toString();
      await RedisWriteClient.set(`${METRICS_KEY}:${field}`, newValue);
    } catch (error) {
      // Silently fail - metrics should not break the app
      logger.error({ field, error }, '[CacheMetrics] Error incrementing:');
    }
  }

  /**
   * Get a metric value from Redis
   */
  private async getValue(field: string): Promise<number> {
    try {
      const value = await RedisReadClient.get(`${METRICS_KEY}:${field}`);
      return parseInt(value || '0', 10);
    } catch {
      return 0;
    }
  }

  hit(): void {
    this.increment('hits').catch(() => {});
  }

  miss(): void {
    this.increment('misses').catch(() => {});
  }

  invalidate(count = 1): void {
    this.increment('invalidations', count).catch(() => {});
  }

  warmup(predicateCount = 0): void {
    this.increment('warmups').catch(() => {});
    if (predicateCount > 0) {
      this.increment('warmupPredicates', predicateCount).catch(() => {});
    }
  }

  error(): void {
    this.increment('errors').catch(() => {});
  }

  async getStats(): Promise<CacheStats> {
    const [
      hits,
      misses,
      invalidations,
      warmups,
      warmupPredicates,
      errors,
    ] = await Promise.all([
      this.getValue('hits'),
      this.getValue('misses'),
      this.getValue('invalidations'),
      this.getValue('warmups'),
      this.getValue('warmupPredicates'),
      this.getValue('errors'),
    ]);

    const total = hits + misses;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      hits,
      misses,
      hitRate: total > 0 ? Math.round((hits / total) * 10000) / 100 : 0,
      invalidations,
      warmups,
      warmupPredicates,
      errors,
      uptimeSeconds,
    };
  }

  async reset(): Promise<void> {
    try {
      await RedisWriteClient.del([
        `${METRICS_KEY}:hits`,
        `${METRICS_KEY}:misses`,
        `${METRICS_KEY}:invalidations`,
        `${METRICS_KEY}:warmups`,
        `${METRICS_KEY}:warmupPredicates`,
        `${METRICS_KEY}:errors`,
      ]);
      this.startTime = Date.now();
    } catch (error) {
      logger.error({ error: error }, '[CacheMetrics] Error resetting:');
    }
  }
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  invalidations: number;
  warmups: number;
  warmupPredicates: number;
  errors: number;
  uptimeSeconds: number;
}

export const CacheMetrics = new CacheMetricsClass();
