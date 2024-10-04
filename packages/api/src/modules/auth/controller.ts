import { addMinutes } from 'date-fns';

import { RecoverCodeType, User } from '@src/models';
import GeneralError, { ErrorTypes } from '@src/utils/error/GeneralError';

import { NotFound, error } from '@utils/error';
import { Responses, successful, bindMethods, TokenUtils } from '@utils/index';

import { RecoverCodeService } from '../recoverCode/services';

import { IAuthService, ICreateRecoverCodeRequest, ISignInRequest } from './types';
import app from '@src/server/app';
import { Request } from 'express';
import { Provider } from 'fuels';
const { FUEL_PROVIDER } = process.env;

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { digest, encoder, signature, userAddress } = req.body;

      const { userToken, signin } = await TokenUtils.createAuthToken(
        signature,
        digest,
        encoder,
        userAddress,
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
      const { address, networkUrl } = req.body;
      const { origin } = req.headers ?? { origin: 'no-agent' };
      const owner = await User.findOne({ where: { address } });

      if (!owner) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'User not found',
          detail: `User not found`,
        });
      }

      const provider = await Provider.create(networkUrl ?? FUEL_PROVIDER);

      const response = await new RecoverCodeService().create({
        owner,
        type: RecoverCodeType.AUTH,
        origin: origin ?? process.env.UI_URL,
        validAt: addMinutes(new Date(), 5),
        network: {
          url: provider.url,
          chainId: provider.getChainId(),
        },
      });

      console.log('response', response);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
