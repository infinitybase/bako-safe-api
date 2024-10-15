import crypto from 'crypto';

import { IPredicatePayload } from '@src/modules/predicate/types';
import { Vault, VaultConfigurable } from 'bakosafe';
import { Provider } from 'fuels';
import FuelProvider from '@src/utils/FuelProvider';

const { FUEL_PROVIDER } = process.env;

type IPredicateMockPayload = Omit<IPredicatePayload, 'user' | 'version' | 'root'>;

export class PredicateMock {
  public configurable: VaultConfigurable;
  public predicatePayload: IPredicateMockPayload;
  public vault: Vault;

  protected constructor(
    configurable: VaultConfigurable,
    predicatePayload: IPredicateMockPayload,
    vault: Vault,
  ) {
    this.configurable = configurable;
    this.predicatePayload = predicatePayload;
    this.vault = vault;
  }

  public static async create(signaturesCount: number, signers: string[]) {
    const _provider = await FuelProvider.create(FUEL_PROVIDER);
    const _configurable: VaultConfigurable = {
      SIGNATURES_COUNT: signaturesCount,
      SIGNERS: signers,
    };

    const vault = new Vault(_provider, _configurable);

    const predicatePayload: IPredicateMockPayload = {
      name: crypto.randomUUID(),
      description: crypto.randomUUID(),
      predicateAddress: vault.address.toString(),
      configurable: JSON.stringify(_configurable),
    };

    return new PredicateMock(_configurable, predicatePayload, vault);
  }
}
