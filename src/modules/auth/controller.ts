import { addMinutes } from 'date-fns';

import { Encoder } from '@src/models';
import { Workspace } from '@src/models/Workspace';
import GeneralError from '@src/utils/error/GeneralError';

import { IAuthRequest } from '@middlewares/auth/types';

import { error } from '@utils/error';
import { Responses, successful, bindMethods, Web3Utils } from '@utils/index';

import { IUserService } from '../user/types';
import { ServiceWorkspace } from '../workspace/services';
import { IAuthService, ISignInRequest } from './types';

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

      const workspace = await new ServiceWorkspace()
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

      return successful(
        {
          accessToken: userToken.accessToken,
          avatar: userToken.avatar,
        },
        Responses.Ok,
      );
    } catch (e) {
      console.log(e);
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
}
