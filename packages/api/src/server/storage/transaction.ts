import { RedisReadClient, RedisWriteClient } from '@src/utils';
import { cacheConfig, CacheMetrics } from '@src/config/cache';

const { prefixes } = cacheConfig;

// Transaction cache specific config
// Longer TTL since we only cache confirmed transactions (deposits)
// which are immutable once on-chain
const TRANSACTION_CACHE_TTL = parseInt(
  process.env.TRANSACTION_CACHE_TTL || '600',
  10,
); // 10 minutes default (confirmed txs are immutable)
const TRANSACTION_CACHE_PREFIX = 'tx';

// How many recent transactions to fetch on incremental refresh
const INCREMENTAL_FETCH_LIMIT = parseInt(
  process.env.TRANSACTION_INCREMENTAL_LIMIT || '10',
  10,
);

/**
 * Generic transaction type for cache
 * Uses unknown[] to be compatible with any transaction type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheableTransaction = Record<string, any>;

/**
 * Serialized transaction for Redis storage
 * We store the formatted transaction response directly
 */
interface CachedTransactionData {
  transactions: CacheableTransaction[];
  timestamp: number;
  chainId: number;
  predicateAddress: string;
  // Store known transaction hashes for fast deduplication
  knownHashes: string[];
}

/**
 * Result from incremental fetch
 */
export interface IncrementalFetchResult {
  cachedTransactions: CacheableTransaction[];
  needsIncrementalFetch: boolean;
  knownHashes: Set<string>;
}

/**
 * TransactionCache - Redis-based cache for Fuel blockchain transactions
 *
 * Features:
 * - Caches confirmed transactions by predicate address and chainId
 * - Long TTL (10 minutes) since confirmed txs are immutable
 * - Incremental refresh: on invalidation, fetches only new txs and merges
 * - Deduplication using transaction hashes
 */
export class TransactionCache {
  private static instance?: TransactionCache;

  protected constructor() {}

  /**
   * Build cache key for transactions
   */
  private buildKey(predicateAddress: string, chainId: number): string {
    return `${TRANSACTION_CACHE_PREFIX}:${predicateAddress}:${chainId}`;
  }

  /**
   * Build refresh flag key (indicates cache needs incremental update)
   */
  private buildRefreshKey(predicateAddress: string, chainId: number): string {
    return `${TRANSACTION_CACHE_PREFIX}:refresh:${predicateAddress}:${chainId}`;
  }

  /**
   * Check if cache needs incremental refresh
   */
  async needsRefresh(
    predicateAddress: string,
    chainId: number,
  ): Promise<boolean> {
    const refreshFlag = await RedisReadClient.get(
      this.buildRefreshKey(predicateAddress, chainId),
    );
    return !!refreshFlag;
  }

  /**
   * Get cached transactions and check if incremental fetch is needed
   * Returns cached data + flag indicating if caller should fetch new txs
   */
  async getWithRefreshCheck(
    predicateAddress: string,
    chainId: number,
  ): Promise<IncrementalFetchResult> {
    if (!cacheConfig.enabled) {
      return {
        cachedTransactions: [],
        needsIncrementalFetch: true,
        knownHashes: new Set(),
      };
    }

    try {
      const key = this.buildKey(predicateAddress, chainId);
      const cached = await RedisReadClient.get(key);
      const needsRefresh = await this.needsRefresh(predicateAddress, chainId);

      if (!cached) {
        CacheMetrics.miss();
        return {
          cachedTransactions: [],
          needsIncrementalFetch: true,
          knownHashes: new Set(),
        };
      }

      const data: CachedTransactionData = JSON.parse(cached);
      const knownHashes = new Set(data.knownHashes || []);

      if (needsRefresh) {
        // Cache exists but needs incremental update
        console.log(
          `[TxCache] REFRESH needed for ${predicateAddress?.slice(0, 12)}... chain:${chainId} (${data.transactions.length} cached txs)`,
        );
        return {
          cachedTransactions: data.transactions,
          needsIncrementalFetch: true,
          knownHashes,
        };
      }

      // Cache is fresh
      CacheMetrics.hit();
      console.log(
        `[TxCache] HIT ${predicateAddress?.slice(0, 12)}... chain:${chainId} (${Math.round((Date.now() - data.timestamp) / 1000)}s old, ${data.transactions.length} txs)`,
      );

      return {
        cachedTransactions: data.transactions,
        needsIncrementalFetch: false,
        knownHashes,
      };
    } catch (error) {
      console.error('[TxCache] GET error:', error);
      CacheMetrics.error();
      return {
        cachedTransactions: [],
        needsIncrementalFetch: true,
        knownHashes: new Set(),
      };
    }
  }

  /**
   * Legacy get method for backwards compatibility
   * Returns null if not cached or needs refresh
   */
  async get(
    predicateAddress: string,
    chainId: number,
  ): Promise<CacheableTransaction[] | null> {
    const result = await this.getWithRefreshCheck(predicateAddress, chainId);

    if (result.needsIncrementalFetch && result.cachedTransactions.length === 0) {
      return null;
    }

    if (result.needsIncrementalFetch) {
      // Has cache but needs refresh - return null to trigger full fetch
      // The caller should use getWithRefreshCheck for incremental behavior
      return null;
    }

    return result.cachedTransactions;
  }

  /**
   * Set cached transactions for a predicate
   */
  async set(
    predicateAddress: string,
    transactions: CacheableTransaction[],
    chainId: number,
  ): Promise<void> {
    if (!cacheConfig.enabled) {
      return;
    }

    try {
      const key = this.buildKey(predicateAddress, chainId);

      // Extract hashes for deduplication
      const knownHashes = transactions
        .map(tx => tx.hash || tx.id)
        .filter((h): h is string => !!h);

      const data: CachedTransactionData = {
        transactions,
        timestamp: Date.now(),
        chainId,
        predicateAddress,
        knownHashes,
      };

      await RedisWriteClient.setWithTTL(
        key,
        JSON.stringify(data),
        TRANSACTION_CACHE_TTL,
      );

      // Clear refresh flag after setting new data
      await this.clearRefreshFlag(predicateAddress, chainId);

      console.log(
        `[TxCache] SET ${predicateAddress?.slice(0, 12)}... chain:${chainId} (${transactions.length} txs, TTL: ${TRANSACTION_CACHE_TTL}s)`,
      );
    } catch (error) {
      console.error('[TxCache] SET error:', error);
      CacheMetrics.error();
    }
  }

  /**
   * Merge new transactions with cached ones (deduplication by hash)
   */
  mergeTransactions<T extends CacheableTransaction>(
    cached: T[],
    newTxs: T[],
    knownHashes: Set<string>,
  ): T[] {
    // Filter out duplicates from new transactions
    const uniqueNewTxs = newTxs.filter(tx => {
      const hash = tx.hash || tx.id;
      return hash && !knownHashes.has(hash);
    });

    if (uniqueNewTxs.length > 0) {
      console.log(
        `[TxCache] MERGE: ${uniqueNewTxs.length} new txs + ${cached.length} cached`,
      );
    }

    // Combine and sort by date (newest first)
    const merged = [...uniqueNewTxs, ...cached];
    return merged.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Mark cache as needing refresh (instead of deleting)
   * Called when a new transaction is created or confirmed
   */
  async markForRefresh(
    predicateAddress: string,
    chainId?: number,
  ): Promise<void> {
    try {
      if (chainId) {
        await RedisWriteClient.setWithTTL(
          this.buildRefreshKey(predicateAddress, chainId),
          String(Date.now()),
          TRANSACTION_CACHE_TTL, // Flag expires with cache
        );

        console.log(
          `[TxCache] MARKED for refresh: ${predicateAddress?.slice(0, 12)}... chain:${chainId}`,
        );
      } else {
        // Mark all chains for this predicate
        const keys = await RedisReadClient.keys(
          `${TRANSACTION_CACHE_PREFIX}:${predicateAddress}:*`,
        );

        for (const key of keys) {
          const parts = key.split(':');
          const keyChainId = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(keyChainId)) {
            await RedisWriteClient.setWithTTL(
              this.buildRefreshKey(predicateAddress, keyChainId),
              String(Date.now()),
              TRANSACTION_CACHE_TTL,
            );
          }
        }

        console.log(
          `[TxCache] MARKED for refresh: ${predicateAddress?.slice(0, 12)}... all chains (${keys.length} keys)`,
        );
      }
    } catch (error) {
      console.error('[TxCache] MARK_REFRESH error:', error);
      CacheMetrics.error();
    }
  }

  /**
   * Clear refresh flag for a predicate
   */
  async clearRefreshFlag(
    predicateAddress: string,
    chainId: number,
  ): Promise<void> {
    try {
      await RedisWriteClient.del([
        this.buildRefreshKey(predicateAddress, chainId),
      ]);
    } catch (error) {
      console.error('[TxCache] CLEAR_REFRESH error:', error);
    }
  }

  /**
   * Legacy invalidate method - now marks for refresh instead of deleting
   */
  async invalidate(predicateAddress: string, chainId?: number): Promise<void> {
    await this.markForRefresh(predicateAddress, chainId);
  }

  /**
   * Force delete cache (for admin/debug purposes)
   */
  async forceDelete(predicateAddress: string, chainId?: number): Promise<void> {
    try {
      if (chainId) {
        const key = this.buildKey(predicateAddress, chainId);
        await RedisWriteClient.del([key]);
        await this.clearRefreshFlag(predicateAddress, chainId);

        console.log(
          `[TxCache] DELETED ${predicateAddress?.slice(0, 12)}... chain:${chainId}`,
        );
      } else {
        const pattern = `${TRANSACTION_CACHE_PREFIX}:${predicateAddress}:*`;
        const deletedCount = await RedisWriteClient.delByPattern(pattern);

        // Also delete refresh flags
        const refreshPattern = `${TRANSACTION_CACHE_PREFIX}:refresh:${predicateAddress}:*`;
        await RedisWriteClient.delByPattern(refreshPattern);

        console.log(
          `[TxCache] DELETED ${predicateAddress?.slice(0, 12)}... all chains (${deletedCount} keys)`,
        );
      }
    } catch (error) {
      console.error('[TxCache] DELETE error:', error);
      CacheMetrics.error();
    }
  }

  /**
   * Get the limit for incremental fetch
   */
  getIncrementalFetchLimit(): number {
    return INCREMENTAL_FETCH_LIMIT;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<{
    totalKeys: number;
    refreshPending: number;
    ttl: number;
    incrementalLimit: number;
    byChain: Record<number, number>;
  }> {
    try {
      const keys = await RedisReadClient.keys(`${TRANSACTION_CACHE_PREFIX}:*`);
      const refreshKeys = keys.filter(k => k.includes(':refresh:'));
      const cacheKeys = keys.filter(k => !k.includes(':refresh:'));

      const byChain: Record<number, number> = {};
      for (const key of cacheKeys) {
        const parts = key.split(':');
        const chainId = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(chainId)) {
          byChain[chainId] = (byChain[chainId] || 0) + 1;
        }
      }

      return {
        totalKeys: cacheKeys.length,
        refreshPending: refreshKeys.length,
        ttl: TRANSACTION_CACHE_TTL,
        incrementalLimit: INCREMENTAL_FETCH_LIMIT,
        byChain,
      };
    } catch (error) {
      console.error('[TxCache] STATS error:', error);
      return {
        totalKeys: 0,
        refreshPending: 0,
        ttl: TRANSACTION_CACHE_TTL,
        incrementalLimit: INCREMENTAL_FETCH_LIMIT,
        byChain: {},
      };
    }
  }

  /**
   * Start the TransactionCache singleton
   */
  static start(): TransactionCache {
    if (!TransactionCache.instance) {
      TransactionCache.instance = new TransactionCache();
      console.log(
        `[TxCache] Started (enabled: ${cacheConfig.enabled}, TTL: ${TRANSACTION_CACHE_TTL}s, incremental: ${INCREMENTAL_FETCH_LIMIT})`,
      );
    }
    return TransactionCache.instance;
  }

  /**
   * Stop the TransactionCache
   */
  static stop(): void {
    if (TransactionCache.instance) {
      TransactionCache.instance = undefined;
      console.log('[TxCache] Stopped');
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): TransactionCache {
    if (!TransactionCache.instance) {
      throw new Error('TransactionCache not started');
    }
    return TransactionCache.instance;
  }
}
