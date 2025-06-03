import { Application } from 'express';
import request from 'supertest';
import { newUser } from '@src/tests/mocks/User';
import { WalletUnlocked, Wallet, Provider, Predicate } from 'fuels';
import { TypeUser } from '@src/models';
import App from '@src/server/app';
import { Provider as FuelProvider } from 'fuels';
import { generateNode } from '../mocks/Networks';
import { Vault } from 'bakosafe';
import { getPredicateVersion } from '../mocks/Predicate';

interface TestUser {
  payload: ReturnType<typeof newUser>['payload'];
  wallet: WalletUnlocked;
  token: string;
}

export class TestEnvironment {
  static async init(
    usersQtd: number = 2,
    predicatesQtd: number = 0,
  ): Promise<{
    app: Application;
    users: TestUser[];
    predicates: Vault[];
    close: () => Promise<void>;
    network: Provider;
    wallets: WalletUnlocked[];
  }> {
    const appInstance = await App.start();
    const app = appInstance.serverApp;

    const {
      provider,
      node: { wallets, cleanup },
    } = await generateNode();

    const users: TestUser[] = [];
    const predicates: Vault[] = [];

    for (let i = 0; i <= usersQtd; i++) {
      if (i > 0) {
        wallets.push(WalletUnlocked.generate());
      }
      const wallet = wallets[i];
      const payload = {
        address: wallet.address.toB256(),
        provider: provider.url,
        type: TypeUser.FUEL,
      };

      const userRes = await request(app).post('/user').send(payload);
      if (userRes.status !== 201) {
        throw new Error(
          `Failed to create user ${i + 1}: ${JSON.stringify(userRes.body)}`,
        );
      }

      const code = userRes.body.code;
      const signature = await wallet.signMessage(code);

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
        payload: {
          address: payload.address,
          provider: payload.provider,
          type: payload.type,
          name: `User ${i + 1}`,
          email: `${new Date().getTime()}@example.com`,
        },
        wallet,
        token: authRes.body.accessToken,
      });
    }

    const n = Math.ceil(usersQtd / 3);
    const userSignersQtd = n >= 1 ? n : 1;
    const version = getPredicateVersion();

    for await (const _ of Array(predicatesQtd)) {
      const _p = new Vault(
        provider,
        {
          SIGNATURES_COUNT: 1,
          SIGNERS: users
            .slice(0, userSignersQtd)
            .map(u => u.wallet.address.toB256()),
        },
        version,
      );
      await (await wallets[0].transfer(_p.address, 1000)).waitForResult();
      predicates.push(_p);
    }

    const close = async () => {
      console.log('Closing test environment...');
      await App.stop();
      console.log('App stopped successfully.');
      cleanup();
      console.log('Node cleanup completed.');
    };

    return {
      app,
      users,
      wallets,
      predicates,
      close,
      network: provider,
    };
  }
}
