import { IConfVault, Vault } from 'bsafe';
import crypto from 'crypto';
import { Provider } from 'fuels';

import { IPredicatePayload } from '@src/modules/predicate/types';

import config from '../../jest.config';
import { defaultConfigurable } from '../utils/configurable';

export class PredicateMock {
  public BSAFEVaultconfigurable: IConfVault;
  public predicatePayload: Omit<IPredicatePayload, 'user'>;
  public vault: Vault;

  protected constructor(
    BSAFEVaultConfigurable: IConfVault,
    predicatePayload: Omit<IPredicatePayload, 'user'>,
    vault: Vault,
  ) {
    this.BSAFEVaultconfigurable = BSAFEVaultConfigurable;
    this.predicatePayload = predicatePayload;
    this.vault = vault;
  }

  public static async create(
    min: number,
    SIGNERS: string[],
  ): Promise<PredicateMock> {
    const _BSAFEVaultconfigurable = {
      SIGNATURES_COUNT: min,
      SIGNERS,
      network: defaultConfigurable['network'],
      chainId: defaultConfigurable['chainId'],
    };

    const vault = await Vault.create({
      configurable: _BSAFEVaultconfigurable,
      provider: await Provider.create(defaultConfigurable['provider']),
    });

    const predicatePayload = {
      name: crypto.randomUUID(),
      description: crypto.randomUUID(),
      provider: vault.provider.url,
      chainId: vault.provider.getChainId(),
      predicateAddress: vault.address.toString(),
      minSigners: min,
      bytes: vault.getBin(),
      abi: JSON.stringify(vault.getAbi()),
      configurable: JSON.stringify({ ...vault.getConfigurable() }),
      addresses: _BSAFEVaultconfigurable.SIGNERS.map(signer => signer),
    };

    return new PredicateMock(_BSAFEVaultconfigurable, predicatePayload, vault);
  }
}
