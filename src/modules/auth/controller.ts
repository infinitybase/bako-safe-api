import { IAuthRequest } from '@src/middlewares/auth/types';

import { error } from '@utils/error';
import { Responses, successful, bindMethods } from '@utils/index';

import {
  IAuthService,
  IAuthWithRefreshTokenRequest,
  ISignInRequest,
} from './types';

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { email, password } = req.body;

      const response = await this.authService.signIn({ email, password });

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async signOut(req: IAuthRequest) {
    try {
      const { user } = req;

      const response = await this.authService.signOut(user);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }

  async authWithRefreshToken(req: IAuthWithRefreshTokenRequest) {
    try {
      const { refreshToken } = req.body;

      const response = await this.authService.authWithRefreshToken(refreshToken);

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error[0], e.statusCode);
    }
  }
}
