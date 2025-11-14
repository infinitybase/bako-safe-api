import { Application } from 'express';
import request from 'supertest';
import { newUser } from '@src/tests/mocks/User';
import { WalletUnlocked, Provider } from 'fuels';
import App from '@src/server/app';
import { Vault, TypeUser } from 'bakosafe';
import { getPredicateVersion } from '../mocks/Predicate';
import { DeployContractConfig, LaunchTestNodeReturn } from 'fuels/test-utils';
import { networks } from '../mocks/Networks';

export interface TestUser {
  payload: ReturnType<typeof newUser>['payload'];
  wallet: WalletUnlocked;
  token: string;
  id: string;
}

export class TestEnvironment {
  static async init(
    usersQtd: number = 2,
    predicatesQtd: number = 0,
    node?: LaunchTestNodeReturn<DeployContractConfig[]>,
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
    const wallets = node?.wallets ?? [];
    const users: TestUser[] = [];
    const predicates: Vault[] = [];

    const provider = node?.provider ?? new Provider(networks['DEVNET']);

    for (let i = 0; i < usersQtd; i++) {
      const wallet = wallets[i] ?? newUser().wallet;

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
          email: `${Date.now()}_${i}@example.com`,
        },
        wallet,
        token: authRes.body.accessToken,
        id: userRes.body.userId,
      });
    }

    const userSignersQtd = Math.max(1, Math.ceil(usersQtd / 3));
    const version = getPredicateVersion();

    for (let i = 0; i < predicatesQtd; i++) {
      const signers = users
        .slice(0, userSignersQtd)
        .map(u => u.wallet.address.toB256());

      const vault = new Vault(
        provider,
        {
          SIGNATURES_COUNT: 1,
          SIGNERS: signers,
        },
        version,
      );

      await (await wallets[0].transfer(vault.address, 1500)).waitForResult();
      predicates.push(vault);
    }

    const close = async () => {
      try {
        await App.stop();
        node?.cleanup();
        console.log('Cleanup finalizado com sucesso.');
      } catch (error) {
        console.error('Erro durante cleanup:', error);
      }
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
