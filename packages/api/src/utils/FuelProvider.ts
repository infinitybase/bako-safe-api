import { Provider, ProviderOptions } from 'fuels';

export class FuelProvider {
  private static instance?: FuelProvider;

  private providers: Record<string, Provider>;

  private constructor() {
    this.providers = {};
  }

  static async create(url: string, options?: ProviderOptions): Promise<Provider> {
    if (FuelProvider.instance.providers[url]) {
      return FuelProvider.instance.providers[url];
    }

    const p = await Provider.create(url, options);
    FuelProvider.instance.providers[url] = p;

    return FuelProvider.instance.providers[url];
  }

  async reset(): Promise<void> {
    const providers: Record<string, Provider> = {};

    const mainNetNetwork =
      'https://bako:LR2RU3jQHPlbqog3tnDmZw@mainnet.fuel.network/v1/graphql';
    providers[mainNetNetwork] = await Provider.create(mainNetNetwork);

    const testNetNetwork = 'https://testnet.fuel.network/v1/graphql';
    providers[testNetNetwork] = await Provider.create(testNetNetwork);

    const faucetTestNetNetwork = 'https://faucet-testnet.fuel.network/';
    providers[faucetTestNetNetwork] = await Provider.create(faucetTestNetNetwork);

    FuelProvider.instance.providers = providers;
  }

  static async start(): Promise<void> {
    if (!FuelProvider.instance) {
      FuelProvider.instance = new FuelProvider();
      FuelProvider.instance.reset();
    }
  }
}
