import axios, { AxiosInstance } from 'axios';
// import { IBakoSafeApi } from 'bakosafe';
import { Wallet } from 'fuels';

import { TypeUser } from '@src/models';

import { IDefaultAccount } from '../../mocks/accounts';
import { FuelProvider } from '../FuelProvider';
import request from 'supertest';
import App from '@src/server/app';

const { API_URL } = process.env;

export type IUserAuth = {
  id: string;
  avatar: string;
  address: string;
};

type AuthenticateUser = {
  provider: string;
  account: IDefaultAccount;
};

type AuthenticateWorkspace = AuthenticateUser & {
  workspaceId: string;
};

//todo: repply this class on SDK to user autentication resource
export class AuthValidations {
  public user: IUserAuth;
  // public authToken: IBakoSafeApi;
  public axios: AxiosInstance;
  public workspace: {
    id: string;
    name: string;
    avatar: string;
  };
  public code: string;
  public sessionAuth: {
    token: string;
    address: string;
  };

  constructor(
    private readonly provider: string,
    private readonly account: IDefaultAccount,
  ) {
    this.axios = axios.create({
      baseURL: API_URL,
    });
  }

  static async authenticateUser(params: AuthenticateUser) {
    const auth = new AuthValidations(params.provider, params.account);
    await auth.create();
    await auth.createSession();
    return auth;
  }

  static async authenticateWorkspace(params: AuthenticateWorkspace) {
    const auth = await this.authenticateUser(params);
    await auth.selectWorkspace(params.workspaceId);
    return auth;
  }

  async create() {
    //let app: Express.Application;
    const appInstance = await App.start();
    const app = appInstance.serverApp as Express.Application;

    // const { data } = await this.axios.post('/user', {
    //   address: this.account.address,
    //   provider: this.provider,
    //   type: TypeUser.FUEL,
    // });

    const { body: data } = await request(app).post('/user').send({
      address: this.account?.address,
      provider: this.provider,
      type: TypeUser.FUEL,
    });

    this.code = data.code;
  }

  async createSession() {
    const tx = await this.signer(this.code);
    const appInstance = await App.start();
    const app = appInstance.serverApp as Express.Application;

    // const { data } = await this.axios.post('/auth/sign-in', {
    //   digest: this.code,
    //   encoder: TypeUser.FUEL,
    //   signature: tx,
    //   userAddress: this.account.address, //this.account.account,
    // });

    const { body: data } = await request(app).post('/auth/sign-in').send({
      digest: this.code,
      encoder: TypeUser.FUEL,
      signature: tx,
      userAddress: this.account.address, //this.account.account,
    });

    this.axios.defaults.headers.common['Authorization'] = data.accessToken;
    this.axios.defaults.headers.common['Signeraddress'] = data.address;
    // this.authToken = {
    //   address: data.address,
    //   token: data.accessToken,
    // };

    this.user = {
      id: data.user_id,
      address: data.address,
      avatar: data.avatar,
    };

    this.workspace = data.workspace;
    this.sessionAuth = {
      token: data.accessToken,
      address: data.address,
    };
  }

  async selectWorkspace(workspaceId: string) {
    const { data } = await this.axios.put('/auth/workspace', {
      workspace: workspaceId,
      user: this.user.id,
      // ...this.authToken,
    });

    this.workspace = data.workspace;
    return data;
  }

  async listMyWorkspaces() {
    const { data } = await this.axios.get(`/workspace/by-user`);
    return data;
  }

  async signer(message: string) {
    const provider = await FuelProvider.create(this.provider);
    const signer = Wallet.fromPrivateKey(this.account.privateKey, provider);
    return await signer.signMessage(message);
  }
}
