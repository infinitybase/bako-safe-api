import { Provider, ProviderOptions } from 'fuels';
import { ProviderWithCache } from './ProviderWithCache';
import { cacheConfig } from '@src/config/cache';

const REFRESH_TIME = 60000 * 60; // 60 minutes
const CACHE_CLEAR_INTERVAL = 60000 * 5; // 5 minutes - clear internal SDK caches
const FUEL_PROVIDER =
  process.env.FUEL_PROVIDER || 'https://testnet.fuel.network/v1/graphql';

// Provider options - use default Fuel SDK settings
// Internal caches are cleared periodically to free memory
const PROVIDER_OPTIONS: ProviderOptions = {};

export class FuelProvider {
  private static instance?: FuelProvider;
  private providers: Record<string, Provider | ProviderWithCache>;
  private chainIdCache: Map<string, number>; // Global cache for chainIds by URL
  private resetIntervalRef?: NodeJS.Timeout;
  private cacheCleanIntervalRef?: NodeJS.Timeout;

  private constructor() {
    this.providers = {};
    this.chainIdCache = new Map();
  }

  /**
   * Create or get a cached Provider instance
   * Returns ProviderWithCache when balance cache is enabled
   */
  static async create(
    url: string,
    options?: ProviderOptions,
  ): Promise<Provider | ProviderWithCache> {
    if (!FuelProvider.instance) {
      throw new Error('FuelProvider not started');
    }

    if (FuelProvider.instance.providers[url]) {
      return FuelProvider.instance.providers[url];
    }

    const mergedOptions = { ...PROVIDER_OPTIONS, ...options };

    // Use ProviderWithCache when cache is enabled
    const provider = cacheConfig.enabled
      ? new ProviderWithCache(url, mergedOptions)
      : new Provider(url, mergedOptions);

    FuelProvider.instance.providers[url] = provider;

    return provider;
  }

  /**
   * Get current provider stats
   */
  static getStats(): { size: number; urls: string[]; chainIds: Record<string, number> } {
    if (!FuelProvider.instance) {
      return { size: 0, urls: [], chainIds: {} };
    }
    const urls = Object.keys(FuelProvider.instance.providers);
    const chainIds = Object.fromEntries(FuelProvider.instance.chainIdCache);
    return {
      size: urls.length,
      urls,
      chainIds,
    };
  }

  /**
   * Get chainId for a URL from global cache
   * Fetches from provider if not cached
   */
  static async getChainId(url: string): Promise<number> {
    if (!FuelProvider.instance) {
      throw new Error('FuelProvider not started');
    }

    // Check cache first
    const cached = FuelProvider.instance.chainIdCache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    // Get or create provider and fetch chainId
    const provider = await FuelProvider.create(url);
    const chainId = await provider.getChainId();

    // Cache the result
    FuelProvider.instance.chainIdCache.set(url, chainId);

    return chainId;
  }

  /**
   * Set chainId in global cache (used by ProviderWithCache)
   */
  static setChainId(url: string, chainId: number): void {
    if (FuelProvider.instance) {
      FuelProvider.instance.chainIdCache.set(url, chainId);
    }
  }

  async reset(): Promise<void> {
    // Clear static caches from Fuel SDK
    Provider.clearChainAndNodeCaches();

    this.providers = {};

    // Use ProviderWithCache for default provider when cache is enabled
    const defaultProvider = cacheConfig.enabled
      ? new ProviderWithCache(FUEL_PROVIDER, PROVIDER_OPTIONS)
      : new Provider(FUEL_PROVIDER, PROVIDER_OPTIONS);

    this.providers[FUEL_PROVIDER] = defaultProvider;
    console.log('[FuelProvider] Reset - cleared all providers and SDK caches');
  }

  /**
   * Clear internal caches of all providers without removing them
   * Called periodically to free memory from ResourceCache
   */
  clearInternalCaches(): void {
    for (const [url, provider] of Object.entries(this.providers)) {
      try {
        if (provider.cache) {
          provider.cache.clear();
        }
      } catch (error) {
        console.error(
          `[FuelProvider] Error clearing cache for ${url.slice(0, 30)}:`,
          error,
        );
      }
    }
    // Also clear static SDK caches
    Provider.clearChainAndNodeCaches();
    console.log('[FuelProvider] Cleared internal SDK caches');
  }

  /**
   * Manually trigger cache cleanup
   */
  static clearCaches(): void {
    if (FuelProvider.instance) {
      FuelProvider.instance.clearInternalCaches();
    }
  }

  static async start(): Promise<void> {
    if (!FuelProvider.instance) {
      const instance = new FuelProvider();
      FuelProvider.instance = instance;
      await instance.reset();

      // Reset providers every 60 minutes
      instance.resetIntervalRef = setInterval(() => {
        instance.reset();
      }, REFRESH_TIME);

      // Clear internal caches every 5 minutes
      instance.cacheCleanIntervalRef = setInterval(() => {
        instance.clearInternalCaches();
      }, CACHE_CLEAR_INTERVAL);

      console.log(
        `[FuelProvider] Started (cache clear every ${
          CACHE_CLEAR_INTERVAL / 60000
        }min)`,
      );
    }
  }

  static stop(): void {
    if (FuelProvider.instance?.resetIntervalRef) {
      clearInterval(FuelProvider.instance.resetIntervalRef);
    }
    if (FuelProvider.instance?.cacheCleanIntervalRef) {
      clearInterval(FuelProvider.instance.cacheCleanIntervalRef);
    }
  }
}
