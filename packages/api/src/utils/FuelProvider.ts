import { Provider, ProviderOptions } from 'fuels';

const REFRESH_TIME = 60000 * 60; // 60 minutes
const FUEL_PROVIDER =
  process.env.FUEL_PROVIDER || 'https://testnet.fuel.network/v1/graphql';

export class FuelProvider {
  private static instance?: FuelProvider;

  private providers: Record<string, Provider>;

  private constructor() {
    this.providers = {};
  }

  static async create(url: string, options?: ProviderOptions): Promise<Provider> {
    console.log('>>> FUEL PROVIDER CREATE - INSTANCE - url');
    if (FuelProvider.instance.providers[url]) {
      return FuelProvider.instance.providers[url];
    }

    const p = new Provider(url, options);
    FuelProvider.instance.providers[url] = p;

    return FuelProvider.instance.providers[url];
  }

  async reset(): Promise<void> {
    const providers: Record<string, Provider> = {};

    providers[FUEL_PROVIDER] = new Provider(FUEL_PROVIDER);

    FuelProvider.instance.providers = providers;
  }

  static async start(): Promise<void> {
    console.log('>>> FUEL PROVIDER START');
    if (!FuelProvider.instance) {
      FuelProvider.instance = new FuelProvider();
      await FuelProvider.instance.reset();
      console.log('>>>>>>>>>>>> FUEL PROVIDER STARTADO', FuelProvider.instance);

      // setInterval(() => {
      //   console.log('[PROVIDER] Refreshing providers');
      //   FuelProvider.instance.reset();
      // }, REFRESH_TIME);
    }
  }
}
