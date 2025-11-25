import { Provider, type CoinQuantity, type ProviderOptions, Address } from 'fuels';
import { BalanceCache } from '@src/server/storage/balance';
import { cacheConfig } from '@src/config/cache';

// Type for address parameter (matches Fuel SDK's Provider.getBalances signature)
type AddressInput = string | Address;

/**
 * Convert address to string (handles both string and Address objects)
 */
function toAddressString(address: AddressInput): string {
  return typeof address === 'string' ? address : address.toB256();
}

/**
 * ProviderWithCache - A transparent wrapper around Fuel's Provider
 * that adds caching for getBalances() calls
 *
 * Features:
 * - Extends Provider natively (same API)
 * - Automatically caches balance results in Redis
 * - Lazy loads chainId (fetched once per instance)
 * - Fallback to blockchain if cache fails
 * - Force refresh method for critical operations
 */
export class ProviderWithCache extends Provider {
  private cachedChainId?: number;
  private balanceCache?: BalanceCache;

  constructor(url: string, options?: ProviderOptions) {
    super(url, options);
  }

  /**
   * Get the BalanceCache instance (lazy initialization)
   */
  private getBalanceCache(): BalanceCache | null {
    if (!cacheConfig.enabled) {
      return null;
    }

    if (!this.balanceCache) {
      try {
        this.balanceCache = BalanceCache.getInstance();
      } catch {
        // BalanceCache not started yet
        return null;
      }
    }

    return this.balanceCache;
  }

  /**
   * Get chainId with caching
   */
  private async getCachedChainId(): Promise<number> {
    if (this.cachedChainId === undefined) {
      this.cachedChainId = await this.getChainId();
    }
    return this.cachedChainId;
  }

  /**
   * Override getBalances to add caching
   * This is the main method called by Vault.getBalances()
   */
  async getBalances(
    address: AddressInput,
  ): Promise<{ balances: CoinQuantity[] }> {
    const cache = this.getBalanceCache();

    // Convert address to string (handles both string and Address objects)
    const addressStr = toAddressString(address);

    // If cache is not available, go directly to blockchain
    if (!cache) {
      return super.getBalances(address);
    }

    try {
      const chainId = await this.getCachedChainId();

      // Try to get from cache
      const cachedBalances = await cache.get(addressStr, chainId);

      if (cachedBalances) {
        return { balances: cachedBalances };
      }

      // Cache miss - fetch from blockchain
      const result = await super.getBalances(address);

      // Store in cache (don't await to not block response)
      cache.set(addressStr, result.balances, chainId, this.url).catch(err => {
        console.error('[ProviderWithCache] Failed to cache balances:', err);
      });

      return result;
    } catch (error) {
      console.error('[ProviderWithCache] Error, falling back to blockchain:', error);
      // Fallback to blockchain on any cache error
      return super.getBalances(address);
    }
  }

  /**
   * Force refresh balances from blockchain (bypass cache)
   * Use this for critical operations like before sending transactions
   */
  async getBalancesForceRefresh(
    address: AddressInput,
  ): Promise<{ balances: CoinQuantity[] }> {
    const result = await super.getBalances(address);

    // Convert address to string (handles both string and Address objects)
    const addressStr = toAddressString(address);

    // Update cache with fresh data
    const cache = this.getBalanceCache();
    if (cache) {
      try {
        const chainId = await this.getCachedChainId();
        await cache.set(addressStr, result.balances, chainId, this.url);
      } catch (err) {
        console.error('[ProviderWithCache] Failed to update cache:', err);
      }
    }

    return result;
  }

  /**
   * Invalidate cache for a specific address
   */
  async invalidateCache(address: string, chainId?: number): Promise<void> {
    const cache = this.getBalanceCache();
    if (cache) {
      const resolvedChainId = chainId ?? (await this.getCachedChainId());
      await cache.invalidate(address, resolvedChainId);
    }
  }

  /**
   * Static factory method that creates a connected ProviderWithCache
   */
  static async createWithCache(
    url: string,
    options?: ProviderOptions,
  ): Promise<ProviderWithCache> {
    const provider = new ProviderWithCache(url, options);

    return provider;
  }
}
