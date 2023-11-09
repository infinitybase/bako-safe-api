import { addMinutes } from 'date-fns';

import { Encoder } from '@src/models';
import GeneralError from '@src/utils/error/GeneralError';

import { IAuthRequest } from '@middlewares/auth/types';

import { error } from '@utils/error';
import { Responses, successful, bindMethods, Web3Utils } from '@utils/index';

import { IUserService } from '../configs/user/types';
import { IDAppsService } from '../dApps/types';
import {
  IActiveSession,
  IAuthService,
  IAuthorizeDappRequest,
  IFindDappRequest,
  ISignInRequest,
} from './types';

export class AuthController {
  private authService: IAuthService;
  private userService: IUserService;
  private dappService: IDAppsService;

  constructor(
    authService: IAuthService,
    userService: IUserService,
    dappService: IDAppsService,
  ) {
    this.authService = authService;
    this.userService = userService;
    this.dappService = dappService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { signature, ...payloadWithoutSignature } = req.body;
      const expiresIn = process.env.TOKEN_EXPIRATION_TIME ?? '15';
      req.app.get('socketServer').to('test').emit('test', 'test');
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

      const userToken = await this.authService.signIn({
        token: req.body.signature,
        encoder: Encoder[req.body.encoder],
        provider: req.body.provider,
        expired_at: addMinutes(req.body.createdAt, Number(expiresIn)),
        payload: JSON.stringify(payloadWithoutSignature),
        user: await this.userService.findOne(req.body.user_id),
      });

      return successful(
        {
          accessToken: userToken.accessToken,
          avatar: userToken.avatar,
        },
        Responses.Ok,
      );
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

  async authorizedDapp(req: IFindDappRequest) {
    try {
      const { sessionID } = req.params;
      const response = await this.dappService.findBySessionID(sessionID);
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async authorizeDapp(req: IAuthorizeDappRequest) {
    try {
      // const { address, sessionId, origin, name } = req.body;
      // const users = await this.userService.findByAddress(address);
      // const existingDapp = await this.dappService.checkExist(
      //   address,
      //   sessionId,
      //   url: origin,
      // );
      // if (existingDapp) return successful(existingDapp, Responses.Created);
      // const response = await this.dappService.create({
      //   sessionId,
      //   origin,
      //   vaults,
      //   name,
      // });
      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async activeSession(req: IActiveSession) {
    try {
      const { sessionId, address } = req.params;
      const result = undefined;
      const dApp = await this.dappService.findBySessionID(sessionId);

      if (!dApp) {
        return error(
          {
            type: 'NotFound',
            title: 'DApp not found',
            detail: `DApp with session id ${sessionId} not found`,
          },
          404,
        );
      }
      // for await (const user of dApp.vaults) {
      //   const token = await this.authService.findToken({
      //     userId: user.id,
      //     notExpired: true,
      //   });
      //   if (token && user.address === address) {
      //     return successful(
      //       {
      //         address: user.address,
      //         accessToken: token.token,
      //         avatar: user.avatar,
      //       },
      //       Responses.Ok,
      //     );
      //   }
      // }
      return successful(result, Responses.NoContent);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
