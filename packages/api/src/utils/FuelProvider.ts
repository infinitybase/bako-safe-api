import { Provider, ProviderOptions } from 'fuels';
import { ProviderWithCache } from './ProviderWithCache';
import { cacheConfig } from '@src/config/cache';

const REFRESH_TIME = 60000 * 60; // 60 minutes
const FUEL_PROVIDER =
  process.env.FUEL_PROVIDER || 'https://testnet.fuel.network/v1/graphql';

// Provider options - use default Fuel SDK cache settings
// Our BalanceCache layer works on top of the SDK's cache
const PROVIDER_OPTIONS: ProviderOptions = {};

export class FuelProvider {
  private static instance?: FuelProvider;
  private providers: Record<string, Provider | ProviderWithCache>;
  private intervalRef?: NodeJS.Timeout;

  private constructor() {
    this.providers = {};
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

  async reset(): Promise<void> {
    const providers: Record<string, Provider | ProviderWithCache> = {};

    // Use ProviderWithCache for default provider when cache is enabled
    providers[FUEL_PROVIDER] = cacheConfig.enabled
      ? new ProviderWithCache(FUEL_PROVIDER, PROVIDER_OPTIONS)
      : new Provider(FUEL_PROVIDER, PROVIDER_OPTIONS);

    this.providers = providers;
  }

  static async start(): Promise<void> {
    if (!FuelProvider.instance) {
      const instance = new FuelProvider();
      FuelProvider.instance = instance;
      await instance.reset();

      instance.intervalRef = setInterval(() => {
        instance.reset();
      }, REFRESH_TIME);
    }
  }

  static stop(): void {
    if (FuelProvider.instance?.intervalRef) {
      clearInterval(FuelProvider.instance.intervalRef);
    }
  }
}
