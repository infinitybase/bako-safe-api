import { bn, type CoinQuantity } from 'fuels';
import { RedisReadClient, RedisWriteClient } from '@src/utils';
import { cacheConfig, CacheMetrics, CacheStats } from '@src/config/cache';

const { prefixes, ttl, invalidationFlagTtl } = cacheConfig;

/**
 * Serialized format for storing in Redis
 * BigNumbers are stored as hex strings
 */
interface SerializedBalance {
  assetId: string;
  amount: string; // hex string
}

interface CachedBalanceData {
  balances: SerializedBalance[];
  timestamp: number;
  chainId: number;
  networkUrl?: string;
}

export interface BalanceCacheStats extends CacheStats {
  totalKeys: number;
  byChain: Record<number, number>;
  config: {
    enabled: boolean;
    ttl: number;
    invalidationFlagTtl: number;
  };
}

/**
 * BalanceCache - Redis-based cache for predicate balances
 *
 * Features:
 * - Serializes/deserializes BigNumbers (BN) to hex strings
 * - Supports invalidation by predicate address, chainId, userId, or workspaceId
 * - Tracks cache metrics (hits, misses, invalidations)
 * - Configurable TTL via environment variables
 */
export class BalanceCache {
  private static instance?: BalanceCache;

  protected constructor() {}

  /**
   * Build cache key for balance
   */
  private buildKey(predicateAddress: string, chainId: number): string {
    return `${prefixes.balance}:${predicateAddress}:${chainId}`;
  }

  /**
   * Build invalidation flag key
   */
  private buildInvalidationKey(
    predicateAddress: string,
    chainId?: number,
  ): string {
    return chainId
      ? `${prefixes.invalidated}:${predicateAddress}:${chainId}`
      : `${prefixes.invalidated}:${predicateAddress}`;
  }

  /**
   * Serialize balances for Redis storage
   * Converts BN to hex strings
   */
  private serializeBalances(balances: CoinQuantity[]): SerializedBalance[] {
    return balances.map(b => ({
      assetId: b.assetId,
      amount: b.amount.toHex(),
    }));
  }

  /**
   * Deserialize balances from Redis
   * Converts hex strings back to BN
   */
  private deserializeBalances(serialized: SerializedBalance[]): CoinQuantity[] {
    return serialized.map(s => ({
      assetId: s.assetId,
      amount: bn(s.amount),
    }));
  }

  /**
   * Check if there's an invalidation flag for this predicate
   */
  async isInvalidated(
    predicateAddress: string,
    chainId: number,
  ): Promise<boolean> {
    // Check specific chainId flag
    const specificFlag = await RedisReadClient.get(
      this.buildInvalidationKey(predicateAddress, chainId),
    );
    if (specificFlag) return true;

    // Check global flag (all chains)
    const globalFlag = await RedisReadClient.get(
      this.buildInvalidationKey(predicateAddress),
    );
    return !!globalFlag;
  }

  /**
   * Get cached balances for a predicate
   * Returns null if not cached, expired, or invalidated
   */
  async get(
    predicateAddress: string,
    chainId: number,
  ): Promise<CoinQuantity[] | null> {
    if (!cacheConfig.enabled) {
      return null;
    }

    try {
      // Check if invalidated
      const invalidated = await this.isInvalidated(predicateAddress, chainId);
      if (invalidated) {
        CacheMetrics.miss();
        return null;
      }

      const key = this.buildKey(predicateAddress, chainId);
      const cached = await RedisReadClient.get(key);

      if (!cached) {
        CacheMetrics.miss();
        return null;
      }

      const data: CachedBalanceData = JSON.parse(cached);
      const balances = this.deserializeBalances(data.balances);

      CacheMetrics.hit();
      console.log(
        `[BalanceCache] HIT ${predicateAddress?.slice(0, 12)}... chain:${chainId} (${Math.round((Date.now() - data.timestamp) / 1000)}s old)`,
      );

      return balances;
    } catch (error) {
      console.error('[BalanceCache] GET error:', error);
      CacheMetrics.error();
      return null;
    }
  }

  /**
   * Set cached balances for a predicate
   */
  async set(
    predicateAddress: string,
    balances: CoinQuantity[],
    chainId: number,
    networkUrl?: string,
  ): Promise<void> {
    if (!cacheConfig.enabled) {
      return;
    }

    try {
      const key = this.buildKey(predicateAddress, chainId);
      const data: CachedBalanceData = {
        balances: this.serializeBalances(balances),
        timestamp: Date.now(),
        chainId,
        networkUrl,
      };

      await RedisWriteClient.setWithTTL(key, JSON.stringify(data), ttl);

      // Clear any invalidation flags after setting new data
      await this.clearInvalidationFlag(predicateAddress, chainId);

      console.log(
        `[BalanceCache] SET ${predicateAddress?.slice(0, 12)}... chain:${chainId} (${balances.length} assets)`,
      );
    } catch (error) {
      console.error('[BalanceCache] SET error:', error);
      CacheMetrics.error();
    }
  }

  /**
   * Invalidate cache for a predicate
   * If chainId is provided, only that chain is invalidated
   * Otherwise, all chains for that predicate are invalidated
   */
  async invalidate(predicateAddress: string, chainId?: number): Promise<void> {
    try {
      if (chainId) {
        // Invalidate specific chain
        const key = this.buildKey(predicateAddress, chainId);
        await RedisWriteClient.del([key]);

        // Set invalidation flag
        await RedisWriteClient.setWithTTL(
          this.buildInvalidationKey(predicateAddress, chainId),
          String(Date.now()),
          invalidationFlagTtl,
        );

        CacheMetrics.invalidate();
        console.log(
          `[BalanceCache] INVALIDATED ${predicateAddress?.slice(0, 12)}... chain:${chainId}`,
        );
      } else {
        // Invalidate all chains for this predicate
        const pattern = `${prefixes.balance}:${predicateAddress}:*`;
        const deletedCount = await RedisWriteClient.delByPattern(pattern);

        // Set global invalidation flag
        await RedisWriteClient.setWithTTL(
          this.buildInvalidationKey(predicateAddress),
          String(Date.now()),
          invalidationFlagTtl,
        );

        CacheMetrics.invalidate(deletedCount || 1);
        console.log(
          `[BalanceCache] INVALIDATED ${predicateAddress?.slice(0, 12)}... all chains (${deletedCount} keys)`,
        );
      }
    } catch (error) {
      console.error('[BalanceCache] INVALIDATE error:', error);
      CacheMetrics.error();
    }
  }

  /**
   * Invalidate cache for all predicates of a user
   * Requires querying the database for user's predicates
   */
  async invalidateByUser(
    userId: string,
    getPredicateAddresses: () => Promise<string[]>,
  ): Promise<number> {
    try {
      const addresses = await getPredicateAddresses();
      let count = 0;

      for (const address of addresses) {
        await this.invalidate(address);
        count++;
      }

      console.log(`[BalanceCache] INVALIDATED user ${userId} (${count} predicates)`);
      return count;
    } catch (error) {
      console.error('[BalanceCache] INVALIDATE_BY_USER error:', error);
      CacheMetrics.error();
      return 0;
    }
  }

  /**
   * Invalidate all cached balances (use with caution!)
   */
  async invalidateAll(): Promise<number> {
    try {
      const pattern = `${prefixes.balance}:*`;
      const deletedCount = await RedisWriteClient.delByPattern(pattern);

      // Also clear invalidation flags
      const invalidationPattern = `${prefixes.invalidated}:*`;
      await RedisWriteClient.delByPattern(invalidationPattern);

      CacheMetrics.invalidate(deletedCount);
      console.log(`[BalanceCache] INVALIDATED ALL (${deletedCount} keys)`);

      return deletedCount;
    } catch (error) {
      console.error('[BalanceCache] INVALIDATE_ALL error:', error);
      CacheMetrics.error();
      return 0;
    }
  }

  /**
   * Clear invalidation flag for a predicate
   */
  async clearInvalidationFlag(
    predicateAddress: string,
    chainId?: number,
  ): Promise<void> {
    try {
      const keys = [this.buildInvalidationKey(predicateAddress)];
      if (chainId) {
        keys.push(this.buildInvalidationKey(predicateAddress, chainId));
      }
      await RedisWriteClient.del(keys);
    } catch (error) {
      console.error('[BalanceCache] CLEAR_INVALIDATION error:', error);
    }
  }

  /**
   * Clear specific cache entry
   */
  async clear(predicateAddress: string, chainId?: number): Promise<void> {
    try {
      if (chainId) {
        const key = this.buildKey(predicateAddress, chainId);
        await RedisWriteClient.del([key]);
      } else {
        const pattern = `${prefixes.balance}:${predicateAddress}:*`;
        await RedisWriteClient.delByPattern(pattern);
      }
    } catch (error) {
      console.error('[BalanceCache] CLEAR error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<BalanceCacheStats> {
    const metrics = await CacheMetrics.getStats();

    try {
      // Get all balance keys
      const keys = await RedisReadClient.keys(`${prefixes.balance}:*`);

      // Count by chainId
      const byChain: Record<number, number> = {};
      for (const key of keys) {
        const parts = key.split(':');
        const chainId = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(chainId)) {
          byChain[chainId] = (byChain[chainId] || 0) + 1;
        }
      }

      return {
        ...metrics,
        totalKeys: keys.length,
        byChain,
        config: {
          enabled: cacheConfig.enabled,
          ttl,
          invalidationFlagTtl,
        },
      };
    } catch (error) {
      console.error('[BalanceCache] STATS error:', error);
      return {
        ...metrics,
        totalKeys: 0,
        byChain: {},
        config: {
          enabled: cacheConfig.enabled,
          ttl,
          invalidationFlagTtl,
        },
      };
    }
  }

  /**
   * Get all cache keys (for debugging)
   */
  async keys(pattern?: string): Promise<string[]> {
    const searchPattern = pattern || `${prefixes.balance}:*`;
    return RedisReadClient.keys(searchPattern);
  }

  /**
   * Start the BalanceCache singleton
   */
  static start(): BalanceCache {
    if (!BalanceCache.instance) {
      BalanceCache.instance = new BalanceCache();
      console.log(
        `[BalanceCache] Started (enabled: ${cacheConfig.enabled}, TTL: ${ttl}s)`,
      );
    }
    return BalanceCache.instance;
  }

  /**
   * Stop the BalanceCache
   */
  static stop(): void {
    if (BalanceCache.instance) {
      BalanceCache.instance = undefined;
      console.log('[BalanceCache] Stopped');
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): BalanceCache {
    if (!BalanceCache.instance) {
      throw new Error('BalanceCache not started');
    }
    return BalanceCache.instance;
  }
}
