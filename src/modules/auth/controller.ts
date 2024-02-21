import { add, addMinutes } from 'date-fns';

import { Encoder, RecoverCodeType } from '@src/models';
import { Workspace } from '@src/models/Workspace';
import GeneralError, { ErrorTypes } from '@src/utils/error/GeneralError';

import { IAuthRequest } from '@middlewares/auth/types';

import { NotFound, error } from '@utils/error';
import { Responses, successful, bindMethods, Web3Utils } from '@utils/index';

import { RecoverCodeService } from '../recoverCode/services';
import { IUserService } from '../user/types';
import { WorkspaceService } from '../workspace/services';
import {
  IAuthService,
  IChangeWorkspaceRequest,
  ISignInRequest,
  ICreateRecoverCodeRequest,
} from './types';

export class AuthController {
  private authService: IAuthService;
  private userService: IUserService;

  constructor(authService: IAuthService, userService: IUserService) {
    this.authService = authService;
    this.userService = userService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { signature, workspace_id, ...payloadWithoutSignature } = req.body;
      const expiresIn = process.env.TOKEN_EXPIRATION_TIME ?? '15';

      new Web3Utils({
        signature,
        message: JSON.stringify(payloadWithoutSignature),
        signerAddress: req.body.address,
      }).verifySignature();

      const existingToken = await this.authService.findToken({
        userId: req.body.user_id,
      });

      if (existingToken) {
        await this.authService.signOut(existingToken.user);
      }

      const workspace = await new WorkspaceService()
        .filter(
          workspace_id
            ? { id: workspace_id }
            : {
                owner: req.body.user_id,
                single: true,
              },
        )
        .list()
        .then((response: Workspace[]) => response[0]);

      const userToken = await this.authService.signIn({
        token: req.body.signature,
        encoder: Encoder[req.body.encoder],
        provider: req.body.provider,
        expired_at: addMinutes(req.body.createdAt, Number(expiresIn)),
        payload: JSON.stringify(payloadWithoutSignature),
        user: await this.userService.findOne(req.body.user_id),
        workspace,
      });

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

      // if (!isUserMember) {
      //   throw new Unauthorized({
      //     type: ErrorTypes.NotFound,
      //     title: UnauthorizedErrorTitles.INVALID_PERMISSION,
      //     detail: `User not found`,
      //   });
      // }

      const token = await this.authService.findToken({
        userId: user,
      });

      if (isUserMember) {
        token.workspace = workspace;
      }

      const response = await token.save();
      const result = {
        workspace: {
          id: response.workspace.id,
          name: response.workspace.name,
          avatar: response.workspace.avatar,
          permissions: response.workspace.permissions[response.user.id],
          single: response.workspace.single,
        },
        token: response.token,
        avatar: response.user.avatar,
        address: response.user.address,
      };

      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  /* todo: validated
   * - request a code to endpoint /auth/webauthn/code -> no required middleware
   *    - add this code on database, with validAt equal now + 5 minutes
   *    - return this code on request
   */
  async createWebAuthCode(req: ICreateRecoverCodeRequest) {
    try {
      const { origin } = req.headers;
      const { type } = req.params;

      const response = await new RecoverCodeService().create({
        type: RecoverCodeType[type],
        origin,
        validAt: add(new Date(), { minutes: 5 }),
      });

      return successful(response, Responses.Created);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
