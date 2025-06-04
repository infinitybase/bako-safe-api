import crypto from 'crypto';
import request from 'supertest';
import { IPredicatePayload } from '@src/modules/predicate/types';
import { Vault, VaultConfigurable } from 'bakosafe';
import { FuelProvider } from '@src/utils';
import { PredicateService } from '@src/modules/predicate/services';
import { TestUser } from '../utils/Setup';
import { Application } from 'express';

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

    const vault = await new PredicateService().instancePredicate(
      JSON.stringify(_configurable),
      _provider.url,
    );

    const predicatePayload: IPredicateMockPayload = {
      name: crypto.randomUUID(),
      description: crypto.randomUUID(),
      predicateAddress: vault.address.toString(),
      configurable: JSON.stringify(_configurable),
    };

    return new PredicateMock(_configurable, predicatePayload, vault);
  }

  public static async getPredicate(users: TestUser[], app: Application) {
    const members: string[] = [];

    for (const user of users) {
      members.push(user.payload.address);
    }

    const { predicatePayload } = await PredicateMock.create(1, members);

    const { body: predicate } = await request(app)
      .post('/predicate')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .send(predicatePayload);

    return predicate;
  }
}
