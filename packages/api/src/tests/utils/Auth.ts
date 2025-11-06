import request from 'supertest';
import { Wallet } from 'fuels';
import App from '@src/server/app';
import { TypeUser } from 'bakosafe';
import { Provider as FuelProvider } from 'fuels';

export class TestSession {
  public app: Express.Application;
  public token: string;

  constructor(
    private readonly provider: string,
    private readonly account: { address: string; privateKey: string },
  ) {}

  public async login() {
    const appInstance = await App.start();
    this.app = appInstance.serverApp;

    const userRes = await request(this.app).post('/user').send({
      address: this.account.address,
      provider: this.provider,
      type: TypeUser.FUEL,
    });

    const code = userRes.body.code;

    const provider = new FuelProvider(this.provider);
    const wallet = Wallet.fromPrivateKey(this.account.privateKey, provider);
    const signature = await wallet.signMessage(code);

    const authRes = await request(this.app).post('/auth/sign-in').send({
      digest: code,
      encoder: TypeUser.FUEL,
      signature,
      userAddress: this.account.address,
    });

    this.token = authRes.body.accessToken;
    return this;
  }
}
