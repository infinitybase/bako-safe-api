// import { JwtUtils } from '@src/utils/jwt';
import UserToken from '@models/UserToken';
import { User } from '@models/index';

import { ErrorTypes } from '@utils/error/GeneralError';
import Internal from '@utils/error/Internal';

import { IAuthService, ICreateUserTokenPayload, ISignInResponse } from './types';

export class AuthService implements IAuthService {
  async signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse> {
    return UserToken.create(payload)
      .save()
      .then(({ token }) => ({ accessToken: token }))
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on token creation',
          detail: e,
        });
      });
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

  async findToken(signature: string): Promise<UserToken | undefined> {
    return UserToken.findOne({
      where: { token: signature },
      relations: ['user'],
    })
      .then(userToken => userToken)
      .catch(e => {
        throw new Internal({
          type: ErrorTypes.Internal,
          title: 'Error on user token find',
          detail: e,
        });
      });
  }
}
