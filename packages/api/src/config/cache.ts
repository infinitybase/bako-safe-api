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
  },

  // Redis key prefixes
  prefixes: {
    balance: 'balance',
    invalidated: 'balance:invalidated',
  },
};

/**
 * Cache metrics singleton for monitoring cache performance
 */
class CacheMetricsClass {
  private hits = 0;
  private misses = 0;
  private invalidations = 0;
  private warmups = 0;
  private warmupPredicates = 0;
  private errors = 0;
  private startTime = Date.now();

  hit(): void {
    this.hits++;
  }

  miss(): void {
    this.misses++;
  }

  invalidate(count = 1): void {
    this.invalidations += count;
  }

  warmup(predicateCount = 0): void {
    this.warmups++;
    this.warmupPredicates += predicateCount;
  }

  error(): void {
    this.errors++;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 10000) / 100 : 0,
      invalidations: this.invalidations,
      warmups: this.warmups,
      warmupPredicates: this.warmupPredicates,
      errors: this.errors,
      uptimeSeconds,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.invalidations = 0;
    this.warmups = 0;
    this.warmupPredicates = 0;
    this.errors = 0;
    this.startTime = Date.now();
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
