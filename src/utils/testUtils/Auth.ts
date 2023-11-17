import { IDefaultAccount } from 'bsafe/dist/cjs/mocks/accounts';
import { createHash } from 'crypto';
import { Provider, Wallet } from 'fuels';
import supertest from 'supertest';

import { User, Encoder } from '@src/models';

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

    this.authToken = result.body.accessToken;
    return result;
  }

  async signer(message: string) {
    const provider = await Provider.create(this.provider);
    const signer = Wallet.fromPrivateKey(this.account.privateKey, provider);
    return await signer.signMessage(message);
  }
}
