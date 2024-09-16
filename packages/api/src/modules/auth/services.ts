import UserToken from '@models/UserToken';
import { Predicate, User } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import { IAuthService, ICreateUserTokenPayload, ISignInResponse } from './types';
import { LessThanOrEqual } from 'typeorm';

export class AuthService implements IAuthService {
  async signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse> {
    try {
      const data = await UserToken.create(payload).save();
      return await AuthService.findToken(data.token);
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

  static async findToken(signature: string): Promise<ISignInResponse | undefined> {
    const QBtoken = UserToken.createQueryBuilder('ut')
      .leftJoin('ut.user', 'user')
      .leftJoin('ut.workspace', 'workspace')
      .addSelect([
        'user.id',
        'user.name',
        'user.avatar',
        'user.address',
        'user.type',
        'user.webauthn',
        'workspace.id',
        'workspace.name',
        'workspace.avatar',
        'workspace.single',
        'workspace.permissions',
        'workspace.description',
      ])
      .where('ut.token = :signature', { signature })
      .andWhere('ut.expired_at > :now', { now: new Date() });

    const { user, workspace, ...token } = await QBtoken.getOne();
    if (!token) {
      return undefined;
    }

    // console.log('[FIND_TOKEN_INFO]: ', { user, workspace, token });
    const QBPredicate = Predicate.createQueryBuilder('p')
      .innerJoin('p.owner', 'owner')
      .select(['p.id', 'p.root', 'owner.id'])
      .where('p.owner_id = :userId', { userId: user.id })
      .andWhere('p.root = :root ', { root: true });

    const result = await QBPredicate.getOne();

    console.log('result:', result);

    if (!result) {
      return {
        //session
        accessToken: token.token,
        expired_at: token.expired_at,
        // user
        name: user.name,
        type: user.type,
        user_id: user.id,
        avatar: user.avatar,
        address: user.address,
        rootWallet: 'not found',
        // workspace
        workspace: {
          ...workspace,
          permissions: workspace.permissions[user.id],
        },
      };
    }

    return {
      //session
      accessToken: token.token,
      expired_at: token.expired_at,
      // user
      name: user.name,
      type: user.type,
      user_id: user.id,
      avatar: user.avatar,
      address: user.address,
      rootWallet: result.id,
      // workspace
      workspace: {
        ...workspace,
        permissions: workspace.permissions[user.id],
      },
    };
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
