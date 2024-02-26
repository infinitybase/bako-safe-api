import { add, addMinutes, isPast } from 'date-fns';
import { Signer, hashMessage } from 'fuels';

import { Workspace } from '@src/models';
import { AuthService } from '@src/modules/auth/services';
import { RecoverCodeService } from '@src/modules/recoverCode/services';
import { UserService } from '@src/modules/user/service';
import { WorkspaceService } from '@src/modules/workspace/services';

import UserToken, { Encoder } from '@models/UserToken';

import { bindMethods } from '@utils/bindMethods';
import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

import { recoverFuelSignature } from './web3';

/**
 *  todo: recebe dois outros valores alem da assinatura [response.authenticatorData, response.clientDataJSON]
 *
 *
 */

export class TokenUtils {
  static async verifySignature({ signature, digest, encoder }) {
    //todo: verify type of signature and decode it
    let address;
    switch (encoder) {
      case Encoder.FUEL:
        address = await recoverFuelSignature(digest, signature);
        break;
      // case Encoder.WEB_AUTHN:
      //   this.verifyWebAuthnSignature();
      //   break;
      default:
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_ENCODER,
          detail: `The provided encoder is invalid`,
        });
    }

    return address;
  }

  //   verifyExpiredToken() {
  //     const expiredToken = isPast(this.userToken.expired_at);

  //     if (expiredToken) {
  //       throw new Unauthorized({
  //         type: ErrorTypes.Unauthorized,
  //         title: UnauthorizedErrorTitles.EXPIRED_TOKEN,
  //         detail: 'The provided token is expired, please sign in again',
  //       });
  //     }

  //     return this;
  //   }

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

  static async invalidateRecoverCode(code: string) {
    const recoverCode = await new RecoverCodeService().findByCode(code);

    if (!recoverCode) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
        detail: `Recover code not found`,
      });
    }

    if (recoverCode.used || isPast(recoverCode.validAt)) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.EXPIRED_TOKEN,
        detail: `Recover code already used`,
      });
    }

    await new RecoverCodeService().update(recoverCode.id, { used: true });
  }

  static async recoverToken(signature: string) {
    const token = await new AuthService().findToken({ signature });
    if (!token) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.SESSION_NOT_FOUND,
        detail: 'Could not find a session for the provided signature',
      });
    }

    if (isPast(token.expired_at)) {
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
    const expiresIn = process.env.TOKEN_EXPIRATION_TIME ?? '15';
    const address = await TokenUtils.verifySignature({
      signature,
      digest,
      encoder,
    });
    await TokenUtils.invalidateRecoverCode(digest);
    const user = await TokenUtils.checkUserExists(address);
    const workspace = await TokenUtils.findSingleWorkspace(user.id);
    await TokenUtils.revokeToken(user.id);

    return await new AuthService().signIn({
      token: signature,
      encoder: Encoder[encoder],
      provider: user.provider,
      expired_at: addMinutes(new Date(), Number(expiresIn)),
      payload: digest,
      user: user,
      workspace,
    });
  }

  static async revokeToken(userId: string) {
    return await UserToken.delete({ user_id: userId });
  }
}
