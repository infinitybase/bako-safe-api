import axios, { AxiosInstance } from 'axios';
import { IBSAFEAuth } from 'bsafe';
import { IDefaultAccount } from 'bsafe/dist/cjs/mocks/accounts';
import { createHash } from 'crypto';
import { Provider, Wallet } from 'fuels';

import { User, Encoder } from '@src/models';

//todo: repply this class on SDK to user autentication resource
export class AuthValidations {
  public user: User;
  public authToken: IBSAFEAuth;
  public axios: AxiosInstance;

  constructor(
    private readonly provider: string,
    private readonly account: IDefaultAccount,
  ) {
    this.axios = axios.create({
      baseURL: 'http://localhost:3333',
    });
  }
  async create() {
    const { data } = await this.axios.post('/user', {
      address: this.account.address,
      provider: this.provider,
    });

    this.user = data;

    return data;
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

    const { data } = await this.axios.post('/auth/sign-in', {
      ...message,
      signature: tx,
    });

    this.axios.defaults.headers.common['Authorization'] = data.accessToken;
    this.axios.defaults.headers.common['Signeraddress'] = this.account.address;
    this.authToken = {
      address,
      token: data.accessToken,
    };
    return data;
  }

  async selectWorkspace(workspaceId: string) {
    const { data } = await this.axios.put('/auth/workspace', {
      workspace_id: workspaceId,
      ...this.authToken,
    });

    return data;
  }

  async listMyWorkspaces() {
    console.log('[LIST_MY_WORKSPACES]');

    const { data } = await this.axios.get(`
      /workspace/by-user/${this.account.address}`);

    console.log(data);
    return data;
  }

  async signer(message: string) {
    const provider = await Provider.create(this.provider);
    const signer = Wallet.fromPrivateKey(this.account.privateKey, provider);
    return await signer.signMessage(message);
  }
}
