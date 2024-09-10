import UserToken from '@models/UserToken';
import { User } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import {
  IAuthService,
  ICreateUserTokenPayload,
  IFindTokenParams,
  ISignInResponse,
} from './types';
import { LessThanOrEqual } from 'typeorm';

export class AuthService implements IAuthService {
  async signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse> {
    try {
      const data = await UserToken.create(payload).save();

      return {
        accessToken: data.token,
        avatar: data.user.avatar,
        user_id: data.user.id,
        expired_at: data.expired_at,
        default_vault: data.user?.default_vault,
        address: data.user?.address,
        workspace: {
          id: data.workspace.id,
          name: data.workspace.name,
          avatar: data.workspace.avatar,
          single: data.workspace.single,
          permissions: data.workspace.permissions,
        },
        first_login: data.user.first_login,
        ...(data.user.type === 'WEB_AUTHN' ? { webAuthn: data.user.webauthn } : {}),
      };
    } catch (e) {
      throw new Internal({
        type: ErrorTypes.Internal,
        title: 'Error on token creation',
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

  async findToken(params: IFindTokenParams): Promise<UserToken | undefined> {
    const queryBuilder = await UserToken.createQueryBuilder('ut')
      .leftJoin('ut.user', 'user')
      .leftJoin('ut.workspace', 'workspace')
      .addSelect([
        'user.id',
        'user.avatar',
        'user.address',
        'user.type',
        'user.webauthn',
        'workspace.id',
        'workspace.name',
        'workspace.avatar',
        'workspace.single',
        'workspace.permissions',
      ]);

    params.userId &&
      queryBuilder.where('ut.user = :userId', { userId: params.userId });

    params.address &&
      queryBuilder.where('user.address = :address', {
        address: params.address,
      });

    params.signature &&
      queryBuilder.where('ut.token = :signature', { signature: params.signature });

    params.notExpired &&
      queryBuilder.andWhere('ut.expired_at > :now', { now: new Date() });

    return await queryBuilder
      .getOne()
      .then(userToken => userToken)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on user token find',
          detail: e,
        });
      });
  }

  static async clearExpiredTokens(): Promise<void> {
    try {
      await UserToken.delete({
        expired_at: LessThanOrEqual(new Date()),
      });
    } catch (e) {
      console.log('[CLEAR_EXPIRED_TOKEN_ERROR]', e);
    }
  }
}
