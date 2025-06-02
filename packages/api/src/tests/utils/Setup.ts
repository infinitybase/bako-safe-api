import { Application } from 'express';
import request from 'supertest';
import { newUser } from '@src/tests/mocks/User';
import { WalletUnlocked, Wallet } from 'fuels';
import { TypeUser } from '@src/models';
import App from '@src/server/app';
import { Provider as FuelProvider } from 'fuels';

interface TestUser {
  payload: ReturnType<typeof newUser>['payload'];
  wallet: WalletUnlocked;
  token: string;
}

export class TestEnvironment {
  public app: Application;
  public server: any;
  public users: TestUser[] = [];

  static async init(
    usersQtd: number = 3,
  ): Promise<{
    app: Application;
    users: TestUser[];
    close: () => Promise<void>;
  }> {
    const appInstance = await App.start();
    const app = appInstance.serverApp;
    const server = app.listen(3000);

    const users: TestUser[] = [];

    for (let i = 0; i < usersQtd; i++) {
      const { payload, wallet } = newUser();

      const userRes = await request(app).post('/user').send(payload);
      if (userRes.status !== 201) {
        throw new Error(
          `Failed to create user ${i + 1}: ${JSON.stringify(userRes.body)}`,
        );
      }

      const code = userRes.body.code;

      const provider = new FuelProvider(payload.provider);
      const fuelsWallet = Wallet.fromPrivateKey(wallet.privateKey, provider);
      const signature = await fuelsWallet.signMessage(code);

      const authRes = await request(app).post('/auth/sign-in').send({
        digest: code,
        encoder: TypeUser.FUEL,
        signature,
        userAddress: payload.address,
      });

      if (authRes.status !== 200) {
        throw new Error(
          `Failed to authenticate user ${i + 1}: ${JSON.stringify(authRes.body)}`,
        );
      }

      users.push({
        payload,
        wallet,
        token: authRes.body.accessToken,
      });
    }

    const close = async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err: any) => (err ? reject(err) : resolve()));
      });
      await App.stop();
    };

    return {
      app,
      users,
      close,
    };
  }
}
