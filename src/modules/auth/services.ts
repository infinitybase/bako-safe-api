import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import User from '@src/models/master/User';
import UserToken from '@src/models/master/UserToken';
import EncryptUtils from '@src/utils/EncryptUtils';
import Internal from '@src/utils/error/Internal';
import Unauthorized, {
  UnauthorizedErrorTitles,
} from '@src/utils/error/Unauthorized';
import { JwtUtils } from '@src/utils/jwt';
import { IRefreshTokenPayload } from '@src/utils/jwt/types';

import { ErrorTypes } from '../../utils/error/GeneralError';
import {
  IAuthService,
  IAuthWithRefreshTokenResponse,
  ISignInPayload,
  ISignInResponse,
} from './types.js';

export class AuthService implements IAuthService {
  async signIn({ email, password }: ISignInPayload): Promise<ISignInResponse> {
    try {
      const user = await User.findOne(
        { email },
        {
          select: [
            'id',
            'name',
            'active',
            'email',
            'password',
            'language',
            'createdAt',
            'updatedAt',
          ],
          relations: ['role'],
        },
      );

      if (!user) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_CREDENTIALS,
          detail: `User not found`,
        });
      }

      if (!user.active) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_CREDENTIALS,
          detail: 'User inactive',
        });
      }

      const isValidPassword = await EncryptUtils.compare(password, user.password);

      if (!isValidPassword) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_CREDENTIALS,
          detail: `Invalid password`,
        });
      }

      delete user.password;

      const accessToken = JwtUtils.generateAccessToken({
        userId: user.id,
      });

      const refreshToken = JwtUtils.generateRefreshToken({
        userId: user.id,
      });

      await UserToken.delete({
        user: user,
      });

      await UserToken.create({
        token: refreshToken,
        user,
      }).save();

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (e) {
      if (e instanceof Unauthorized) {
        throw e;
      }

      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on sign in',
        detail: e,
      });
    }
  }

  async signOut(user: User): Promise<void> {
    try {
      await UserToken.delete({
        user: user,
      });
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on sign out',
        detail: e,
      });
    }
  }

  async authWithRefreshToken(
    refreshToken: string,
  ): Promise<IAuthWithRefreshTokenResponse> {
    try {
      const refreshTokenDecoded = JwtUtils.verifyRefreshToken(
        refreshToken,
      ) as IRefreshTokenPayload;

      const userToken = await UserToken.findOne({
        where: {
          user: refreshTokenDecoded.userId,
        },
        relations: ['user'],
      });

      if (!userToken) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_REFRESH_TOKEN,
          detail: 'Invalid refresh token',
        });
      }

      if (!userToken.user.active) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_REFRESH_TOKEN,
          detail: 'User inactive',
        });
      }

      const isValidRefreshToken = await EncryptUtils.compareToken(
        refreshToken,
        userToken.token,
      );

      if (!isValidRefreshToken) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_REFRESH_TOKEN,
          detail: 'Invalid refresh token',
        });
      }

      const newAccessToken = JwtUtils.generateAccessToken({
        userId: refreshTokenDecoded.userId,
      });

      const newRefreshToken = JwtUtils.generateRefreshToken({
        userId: refreshTokenDecoded.userId,
      });

      await UserToken.delete({
        id: userToken.id,
      });

      await UserToken.create({
        token: newRefreshToken,
        user: userToken.user,
      }).save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (e) {
      switch (e.constructor) {
        case Unauthorized:
          throw e;
        case TokenExpiredError:
          throw new Unauthorized({
            type: ErrorTypes.Unauthorized,
            title: UnauthorizedErrorTitles.REFRESH_TOKEN_EXPIRED,
            detail: 'Refresh token expired',
          });
        case JsonWebTokenError:
          throw new Unauthorized({
            type: ErrorTypes.Unauthorized,
            title: UnauthorizedErrorTitles.INVALID_REFRESH_TOKEN,
            detail: 'Invalid refresh token',
          });
        default:
          throw new Internal({
            type: ErrorTypes.Internal,
            title: 'Error authenticating with refresh token',
            detail: e,
          });
      }
    }
  }
}
