import { isPast } from 'date-fns';
import { Signer, hashMessage } from 'fuels';

import UserToken from '@models/UserToken';

import { bindMethods } from '@utils/bindMethods';
import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

/**
 *  todo: recebe dois outros valores alem da assinatura [response.authenticatorData, response.clientDataJSON]
 *
 *
 */

interface Web3UtilsParams {
  signature: string;
  message?: string;
  address: string;
  userToken?: UserToken;
}

export class Web3Utils {
  private signature: string;
  private userToken?: UserToken;
  private message?: string;
  private address: string;

  constructor({ signature, userToken, message, address }: Web3UtilsParams) {
    Object.assign(this, { signature, userToken, message, address });
    bindMethods(this);
  }

  verifySignature() {
    //todo: verify type of signature and decode it
    const decodedAddress = Signer.recoverAddress(
      hashMessage(this.message ?? this.userToken.payload),
      this.signature,
    ).bech32Address;

    const addressMatches = decodedAddress === this?.address;

    if (!addressMatches) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_ADDRESS,
        detail: `The provided address does not match with the message's signer address`,
      });
    }

    return this;
  }

  verifyExpiredToken() {
    const expiredToken = isPast(this.userToken.expired_at);

    if (expiredToken) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.EXPIRED_TOKEN,
        detail: 'The provided token is expired, please sign in again',
      });
    }

    return this;
  }
}
