import { AuthValidations } from '@utils/testUtils/Auth';
import { accounts } from '@src/mocks/accounts';
import { networks } from '@mocks/networks';
import { generateUser } from '@utils/testUtils/Workspace';
import { PredicateMock } from '@mocks/predicate';
import App from '@src/server/app';
import Express from 'express';
import request from 'supertest';
//import * as http from 'http';

export class SetupApi {
  static async setup() {
    const appInstance = await App.start();
    const app: Express.Application = appInstance.serverApp;

    const api = await this.defaultApi();

    const data_user1 = await generateUser(api, app);
    const data_user2 = await generateUser(api, app);

    // const {
    //   data_user1,
    //   data_user2,
    //   data: workspace,
    // } = await generateWorkspacePayload(api);
    // await api.selectWorkspace(workspace.id);

    const members = [data_user1.address, data_user2.address];
    const { predicatePayload } = await PredicateMock.create(1, members);

    console.log('>>> API SETUP', api.axios.defaults.headers);
    // const { data: predicate } = await api.axios.post(
    //   '/predicate',
    //   predicatePayload,
    // );

    const { body: predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', api.sessionAuth.token)
      .set('Signeraddress', api.sessionAuth.address);

    // const notWorkspaceMemberApi = await this.notWorkspaceMemberApi();
    // const notFoundPermissionApi = await this.notFoundPermissionApi(
    //   predicate.workspace.id,
    // );

    return {
      api,
      predicate,
      //notFoundPermissionApi,
      //notWorkspaceMemberApi,
    };
  }

  static async defaultApi() {
    return AuthValidations.authenticateUser({
      account: accounts['USER_5'],
      provider: networks['local'],
    });
  }

  // static async notWorkspaceMemberApi() {
  //   return AuthValidations.authenticateUser({
  //     account: accounts['USER_2'],
  //     provider: networks['local'],
  //   });
  // }

  // static async notFoundPermissionApi(workspaceId: string) {
  //   return AuthValidations.authenticateWorkspace({
  //     account: accounts['USER_3'],
  //     provider: networks['local'],
  //     workspaceId,
  //   });
  // }
}
