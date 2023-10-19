import { createHash } from 'crypto';
import { af } from 'date-fns/locale';
import { Provider, Wallet } from 'fuels';
import supertest from 'supertest';

import { IDefaultAccount, accounts } from '@src/mocks/accounts';
import { netoworks } from '@src/mocks/networks';
import { Encoder, User } from '@src/models';
import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();

describe('[PREDICATE]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
    await app.init();
  });

  const request = supertest(app.serverApp);

  test(
    '[CREATE] /predicate/',
    async () => {
      const auth = new AuthValidations(
        request,
        netoworks['local'],
        accounts['USER_1'],
      );

      await auth.create();

      await auth.createSession();
    },
    40 * 1000,
  );
});

export class AuthValidations {
  public user: User;
  public authToken: string;

  constructor(
    private readonly request: supertest.SuperTest<supertest.Test>,
    private readonly provider: string,
    private readonly account: IDefaultAccount,
  ) {}
  async create() {
    const result = await this.request
      .post('/user')
      .send({
        address: this.account.address,
        provider: this.provider,
      })
      .expect(201);

    this.user = result.body;
    return result;
  }

  async createSession() {
    const { address, provider, id } = this.user;
    const message = {
      address,
      hash: createHash('sha256').toString(),
      createdAt: new Date().toISOString(),
      encoder: Encoder.fuel,
      provider,
      user_id: id,
    };

    const tx = await this.signer(JSON.stringify(message));

    const result = await this.request
      .post('/auth/sign-in')
      .send({
        ...message,
        signature: tx,
      })
      .expect(200);

    this.authToken = result.body.token;
    return result;
  }

  async signer(message: string) {
    const signer = Wallet.fromPrivateKey(this.account.privateKey, this.provider);
    return await signer.signMessage(message);
  }
}
