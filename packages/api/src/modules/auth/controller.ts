import { addMinutes } from 'date-fns';

import { RecoverCodeType, User } from '@src/models';
import UserToken from '@src/models/UserToken';
import { Workspace } from '@src/models/Workspace';
import GeneralError, { ErrorTypes } from '@src/utils/error/GeneralError';

import { NotFound, error } from '@utils/error';
import { Responses, successful, bindMethods, TokenUtils } from '@utils/index';

import { RecoverCodeService } from '../recoverCode/services';
import { WorkspaceService } from '../workspace/services';
import {
  IAuthService,
  IChangeWorkspaceRequest,
  ICreateRecoverCodeRequest,
  ISignInRequest,
} from './types';
import app from '@src/server/app';
import { Request } from 'express';
import { Network, Provider } from 'fuels';
const { FUEL_PROVIDER } = process.env;

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { digest, encoder, signature } = req.body;

      // move to request body
      const networkUrl = FUEL_PROVIDER;
      const fuelProvider = await Provider.create(networkUrl);

      const network: Network = {
        url: networkUrl,
        chainId: fuelProvider.getChainId(),
      };

      const { userToken, signin } = await TokenUtils.createAuthToken(
        signature,
        digest,
        encoder,
        network,
      );

      await app._sessionCache.addSession(userToken.accessToken, userToken);
      return successful(signin, Responses.Ok);
    } catch (e) {
      if (e instanceof GeneralError) throw e;

      return error(e.error, e.statusCode);
    }
  }

  async signOut(req: Request) {
    try {
      const token = req?.headers?.authorization;

      if (token) {
        await app._sessionCache.removeSession(token);
      }

      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async generateSignCode(req: ICreateRecoverCodeRequest) {
    try {
      const { address } = req.body;
      const { origin } = req.headers ?? { origin: 'no-agent' };
      const owner = await User.findOne({ where: { address } });

      const response = await new RecoverCodeService().create({
        owner,
        type: RecoverCodeType.AUTH,
        origin: origin ?? process.env.UI_URL,
        validAt: addMinutes(new Date(), 5),
      });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  // change wk are desabled
  // async updateWorkspace(req: IChangeWorkspaceRequest) {
  //   try {
  //     const { workspace: workspaceId, user } = req.body;
  //     const workspace = await new WorkspaceService()
  //       .filter({ id: workspaceId })
  //       .list()
  //       .then((response: Workspace[]) => response[0]);

  //     if (!workspace)
  //       throw new NotFound({
  //         type: ErrorTypes.NotFound,
  //         title: 'Workspace not found',
  //         detail: `Workspace not found`,
  //       });

  //     const isUserMember = workspace.members.find(m => m.id === user);

  //     const token = await TokenUtils.getTokenBySignature(req.headers.authorization);

  //     if (isUserMember) {
  //       token.workspace = workspace;
  //     }

  //     await app._sessionCache.addSession(token.token, token);

  //     return successful(
  //       await token.save().then(({ workspace, token, user }: UserToken) => {
  //         return {
  //           workspace: {
  //             id: workspace.id,
  //             name: workspace.name,
  //             avatar: workspace.avatar,
  //             permissions: workspace.permissions[user.id],
  //             single: workspace.single,
  //           },
  //           token: token,
  //           avatar: user.avatar,
  //           address: user.address,
  //         };
  //       }),
  //       Responses.Ok,
  //     );
  //   } catch (e) {
  //     return error(e.error, e.statusCode);
  //   }
  // }
}
