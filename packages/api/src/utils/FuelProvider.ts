import { Provider, ProviderOptions } from 'fuels';

const REFRESH_TIME = 60000 * 60; // 60 minutes
const FUEL_PROVIDER =
  process.env.FUEL_PROVIDER || 'https://testnet.fuel.network/v1/graphql';

export class FuelProvider {
  private static instance?: FuelProvider;
  private providers: Record<string, Provider>;
  private intervalRef?: NodeJS.Timeout;

  private constructor() {
    this.providers = {};
  }

  static async create(url: string, options?: ProviderOptions): Promise<Provider> {
    if (!FuelProvider.instance) {
      throw new Error('FuelProvider not started');
    }

    if (FuelProvider.instance.providers[url]) {
      return FuelProvider.instance.providers[url];
    }

    const p = new Provider(url, options);
    FuelProvider.instance.providers[url] = p;

    return p;
  }

  async reset(): Promise<void> {
    const providers: Record<string, Provider> = {};
    providers[FUEL_PROVIDER] = new Provider(FUEL_PROVIDER);
    this.providers = providers;
  }

  static async start(): Promise<void> {
    if (!FuelProvider.instance) {
      const instance = new FuelProvider();
      FuelProvider.instance = instance;
      await instance.reset();

      instance.intervalRef = setInterval(() => {
        console.log('[PROVIDER] Refreshing providers');
        instance.reset();
      }, REFRESH_TIME);

      console.log('[PROVIDER] FuelProvider started');
    }
  }

  static stop(): void {
    if (FuelProvider.instance?.intervalRef) {
      clearInterval(FuelProvider.instance.intervalRef);
    }
  }
}
