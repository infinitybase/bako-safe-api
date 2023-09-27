import { addMinutes } from 'date-fns';

import { Encoder } from '@src/models';
import GeneralError from '@src/utils/error/GeneralError';

import { IAuthRequest } from '@middlewares/auth/types';

import { error } from '@utils/error';
import { Responses, successful, bindMethods, Web3Utils } from '@utils/index';

import { IAuthService, ISignInRequest } from './types';

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { signature, ...payloadWithoutSignature } = req.body;
      const expiresIn = process.env.TOKEN_EXPIRATION_TIME ?? '15';

      new Web3Utils({
        signature,
        message: JSON.stringify(payloadWithoutSignature),
        signerAddress: req.body.address,
      }).verifySignature();

      const existingToken = await this.authService.findToken(signature);

      if (existingToken) {
        await this.authService.signOut(existingToken.user);
      }

      const userToken = await this.authService.signIn({
        token: req.body.signature,
        encoder: Encoder[req.body.encoder],
        provider: req.body.provider,
        expired_at: addMinutes(req.body.createdAt, Number(expiresIn)),
        payload: JSON.stringify(payloadWithoutSignature),
        user_id: req.body.user_id,
      });

      return successful({ accessToken: userToken.accessToken }, Responses.Ok);
    } catch (e) {
      if (e instanceof GeneralError) throw e;

      return error(e.error[0], e.statusCode);
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
