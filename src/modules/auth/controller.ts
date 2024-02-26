import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import GeneralError, { ErrorTypes } from '@src/utils/error/GeneralError';

import { IAuthRequest } from '@middlewares/auth/types';

import { NotFound, error } from '@utils/error';
import { Responses, successful, bindMethods, TokenUtils } from '@utils/index';

import { WorkspaceService } from '../workspace/services';
import { IAuthService, IChangeWorkspaceRequest, ISignInRequest } from './types';

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { digest, encoder, signature } = req.body;

      const userToken = await TokenUtils.createAuthToken(
        signature,
        digest,
        encoder,
      );

      return successful(userToken, Responses.Ok);
    } catch (e) {
      if (e instanceof GeneralError) throw e;

      return error(e.error, e.statusCode);
    }
  }

  async signOut(req: IAuthRequest) {
    try {
      const response = await this.authService.signOut(req.user);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async updateWorkspace(req: IChangeWorkspaceRequest) {
    try {
      const { workspace: workspaceId, user } = req.body;
      const workspace = await new WorkspaceService()
        .filter({ id: workspaceId })
        .list()
        .then((response: Workspace[]) => response[0]);

      if (!workspace)
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Workspace not found',
          detail: `Workspace not found`,
        });

      const isUserMember = workspace.members.find(m => m.id === user);
      const hasPermission = !!workspace.permissions[user];

      const token = await this.authService.findToken({
        userId: user,
      });

      if (isUserMember || hasPermission) {
        token.workspace = workspace;
      }

      return successful(
        await token.save().then(({ workspace, token, user }: UserToken) => {
          return {
            workspace: {
              id: workspace.id,
              name: workspace.name,
              avatar: workspace.avatar,
              permissions: workspace.permissions[user.id],
              single: workspace.single,
            },
            token: token,
            avatar: user.avatar,
            address: user.address,
          };
        }),
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
