import { AuthValidations } from '@utils/testUtils/Auth';
import { accounts } from 'bakosafe';
import { networks } from '@mocks/networks';
import { generateWorkspacePayload } from '@utils/testUtils/Workspace';
import { PredicateMock } from '@mocks/predicate';

export class SetupApiTokenTest {
  static async setup() {
    const api = await this.defaultApi();

    const {
      data_user1,
      data_user2,
      data: workspace,
    } = await generateWorkspacePayload(api);
    await api.selectWorkspace(workspace.id);

    const members = [data_user1.address, data_user2.address];
    const { predicatePayload } = await PredicateMock.create(1, members);

    const { data: predicate } = await api.axios.post(
      '/predicate',
      predicatePayload,
    );

    const notWorkspaceMemberApi = await this.notWorkspaceMemberApi();
    const notFoundPermissionApi = await this.notFoundPermissionApi(
      predicate.workspace.id,
    );

    return {
      api,
      predicate,
      notFoundPermissionApi,
      notWorkspaceMemberApi,
    };
  }

  static async defaultApi() {
    return AuthValidations.authenticateUser({
      account: accounts['USER_1'],
      provider: networks['local'],
    });
  }

  static async notWorkspaceMemberApi() {
    return AuthValidations.authenticateUser({
      account: accounts['USER_2'],
      provider: networks['local'],
    });
  }

  static async notFoundPermissionApi(workspaceId: string) {
    return AuthValidations.authenticateWorkspace({
      account: accounts['USER_3'],
      provider: networks['local'],
      workspaceId,
    });
  }
}
