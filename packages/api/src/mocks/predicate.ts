import crypto from 'crypto';

import { IPredicatePayload } from '@src/modules/predicate/types';
import { Vault, VaultConfigurable } from 'bakosafe';
import { PredicateService } from '@src/modules/predicate/services';
import { Provider } from 'fuels';

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
    const _provider = new Provider(FUEL_PROVIDER);
    const _configurable: VaultConfigurable = {
      SIGNATURES_COUNT: signaturesCount,
      SIGNERS: signers,
    };

    const vault = await new PredicateService().instancePredicate(
      _provider.url,
      JSON.stringify(_configurable),
    );

    const predicatePayload: IPredicateMockPayload = {
      name: crypto.randomUUID(),
      description: crypto.randomUUID(),
      predicateAddress: vault.address.toString(),
      configurable: JSON.stringify(_configurable),
    };

    return new PredicateMock(_configurable, predicatePayload, vault);
  }
}
