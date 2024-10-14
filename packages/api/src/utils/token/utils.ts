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
import App from '@src/server/app';
import { ISignInResponse } from '@src/modules/auth/types';

import { MoreThan } from 'typeorm';
import { Provider } from 'fuels';

const { FUEL_PROVIDER } = process.env;

const EXPIRES_IN = process.env.TOKEN_EXPIRATION_TIME ?? '20';
const RENEWAL_EXPIRES_IN = process.env.RENEWAL_TOKEN_EXPIRATION_TIME ?? '10';
const MINUTES_TO_RENEW = process.env.MINUTES_TO_RENEW_TOKEN ?? 2;

export class TokenUtils {
  static async verifySignature({ signature, digest, encoder }): Promise<string> {
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
    const token = await App.getInstance()._sessionCache.getSession(signature);

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

  static async changeNetwork(userId: string, network: string) {
    const provider = await Provider.create(network ?? FUEL_PROVIDER);
    const _token = await UserToken.findOne({
      where: { user_id: userId },
      relations: ['workspace'],
    });

    const _network = {
      url: provider.url,
      chainId: provider.getChainId(),
    };
    _token.network = _network;

    await _token.save();
    await App.getInstance()._sessionCache.updateSession(_token.token);

    return true;
  }

  static async createAuthToken(
    signature: string,
    digest: string,
    encoder: string,
    userFilter: { address: string } | { name: string },
    // network: Network,
  ) {
    const code = await RecoverCode.findOne({
      where: {
        owner: { address: userAddress },
        type: RecoverCodeType.AUTH,
        validAt: MoreThan(new Date()),
      },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    if (!code) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_RECOVER_CODE,
        detail: 'The provided recover code is invalid',
      });
    }

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
    // const;

    const sig = await new AuthService().signIn({
      token: signature,
      encoder: Encoder[encoder],
      network: code.network,
      expired_at: addMinutes(new Date(), Number(EXPIRES_IN)),
      payload: digest,
      user: user,
      workspace,
    });

    return {
      userToken: await this.getTokenBySignature(sig.accessToken),
      signin: sig,
    };
  }

  static async getTokenBySignature(
    signature: string,
  ): Promise<ISignInResponse | undefined> {
    return AuthService.findToken(signature);
  }

  static async getTokenByUser(userId: string) {
    const userToken = await AuthService.findTokenByUser(userId);
    return userToken;
  }

  static async renewToken(token: ISignInResponse) {
    try {
      const expirationDate = token.expired_at
        ? new Date(token.expired_at)
        : new Date();
      const now = new Date();

      const minutesToExpiration = differenceInMinutes(expirationDate, now);

      if (minutesToExpiration < Number(MINUTES_TO_RENEW)) {
        const _token = await UserToken.findOne({
          where: { token: token.accessToken },
        });
        _token.expired_at = addMinutes(new Date(), Number(RENEWAL_EXPIRES_IN));
        await _token.save();

        const renewedToken = await this.getTokenBySignature(token.accessToken);
        await App.getInstance()._sessionCache.addSession(
          token.accessToken,
          renewedToken,
        );

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
