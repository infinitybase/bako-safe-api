import { addMinutes, differenceInMinutes, isPast, parseISO } from 'date-fns';

import { RecoverCode, RecoverCodeType, User, Workspace } from '@src/models';
import { AuthService } from '@src/modules/auth/services';
import { RecoverCodeService } from '@src/modules/recoverCode/services';
import { UserService } from '@src/modules/user/service';
import { WorkspaceService } from '@src/modules/workspace/services';

import UserToken, { Encoder } from '@models/UserToken';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

import { recoverFuelSignature, recoverWebAuthnSignature } from './web3';
import app from '@src/server/app';
import { ISignInResponse } from '@src/modules/auth/types';

const EXPIRES_IN = process.env.TOKEN_EXPIRATION_TIME ?? '20';
const RENEWAL_EXPIRES_IN = process.env.RENEWAL_TOKEN_EXPIRATION_TIME ?? '10';
const MINUTES_TO_RENEW = process.env.MINUTES_TO_RENEW_TOKEN ?? 2;

export class TokenUtils {
  static async verifySignature({ signature, digest, encoder }) {
    //todo: verify type of signature and decode it
    let address;
    switch (encoder) {
      case Encoder.FUEL:
        address = await recoverFuelSignature(digest, signature);
        break;
      case Encoder.WEB_AUTHN:
        address = await recoverWebAuthnSignature(digest, signature);

        break;
      default:
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_ENCODER,
          detail: `The provided encoder is invalid`,
        });
    }

    return address;
  }

  static async checkUserExists(address: string) {
    const user = await new UserService()
      .filter({ address })
      .find()
      .then(response => {
        return response[0] ?? undefined;
      });

    if (!user) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
        detail: `User not found`,
      });
    }
    return user;
  }

  static async invalidateRecoverCode(user: User, type) {
    const recoverCode = await RecoverCode.findOne({
      where: { owner: user, type },
      order: { createdAt: 'DESC' },
    });

    if (!recoverCode) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
        detail: `Recover code not found`,
      });
    }

    if (recoverCode.used || isPast(new Date(recoverCode.validAt))) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.EXPIRED_TOKEN,
        detail: `Recover code already used`,
      });
    }

    await new RecoverCodeService().update(recoverCode.id, { used: true });
  }

  static async recoverToken(signature: string) {
    const token = await app._sessionCache.getSession(signature);

    if (!token) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.SESSION_NOT_FOUND,
        detail: 'Could not find a session for the provided signature',
      });
    }

    if (isPast(new Date(token.expired_at))) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.EXPIRED_TOKEN,
        detail: 'The provided token is expired, please sign in again',
      });
    }
    return token;
  }

  static async findSingleWorkspace(userId: string) {
    const workspace = await new WorkspaceService()
      .filter({
        owner: userId,
        single: true,
      })
      .list()
      .then((response: Workspace[]) => response[0] ?? undefined);

    if (!workspace) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_ADDRESS,
        detail: `User not found`,
      });
    }

    return workspace;
  }

  static async findLoggedWorkspace(userToken: UserToken) {
    const workspace = await new WorkspaceService()
      .filter({ id: userToken.workspace.id })
      .list()
      .then((response: Workspace[]) => response[0] ?? undefined);

    if (!workspace) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_PERMISSION,
        detail: `Workspace not found`,
      });
    }

    return workspace;
  }

  static async createAuthToken(signature: string, digest: string, encoder: string) {
    try {
      const address = await TokenUtils.verifySignature({
        signature,
        digest,
        encoder,
      });

      if (!address)
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
          detail: `User not found`,
        });

      const user = await TokenUtils.checkUserExists(address);

      await TokenUtils.invalidateRecoverCode(user, RecoverCodeType.AUTH);

      const workspace = await TokenUtils.findSingleWorkspace(user.id);
      await TokenUtils.revokeToken(user); // todo: verify if it's necessary

      const sig = await new AuthService().signIn({
        token: signature,
        encoder: Encoder[encoder],
        provider: user.provider,
        expired_at: addMinutes(new Date(), Number(EXPIRES_IN)),
        payload: digest,
        user: user,
        workspace,
      });

      return {
        userToken: await this.getTokenBySignature(sig.accessToken),
        signin: sig,
      };
    } catch (e) {
      throw e;
    }
  }

  static async getTokenBySignature(signature: string) {
    try {
      const userToken = AuthService.findToken(signature);

      return userToken;
    } catch (e) {
      throw e;
    }
  }

  static async getTokenByUser(userId: string) {
    const userToken = await UserToken.createQueryBuilder('userToken')
      .leftJoinAndSelect('userToken.user', 'user')
      .leftJoinAndSelect('userToken.workspace', 'workspace')
      .where('userToken.user = :userId', { userId })
      .andWhere('userToken.expired_at > :now', { now: new Date() })
      .getOne();

    return userToken;
  }

  static async renewToken(token: ISignInResponse) {
    try {
      const expirationDate = token.expired_at
        ? new Date(token.expired_at)
        : new Date();
      const now = new Date();
      console.log('[RENEW TOKEN INFO]: ', {
        expirationDate,
        now,
      });

      const minutesToExpiration = differenceInMinutes(expirationDate, now);

      if (minutesToExpiration < Number(MINUTES_TO_RENEW)) {
        const _token = await UserToken.findOne({
          where: { token: token.accessToken },
        });
        _token.expired_at = addMinutes(new Date(), Number(RENEWAL_EXPIRES_IN));
        await _token.save();

        const renewedToken = await this.getTokenBySignature(token.accessToken);
        await app._sessionCache.addSession(token.accessToken, renewedToken);

        return renewedToken;
      }

      return token;
    } catch (e) {
      console.log('[RENEW TOKEN ERROR]: DATA FORMAT', e);
      return token;
    }
  }

  static async revokeToken(user: User) {
    return await UserToken.delete({ user });
  }
}
