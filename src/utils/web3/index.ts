import 'bsafe';
import { isPast } from 'date-fns';
import { Signer, hashMessage } from 'fuels';

import UserToken from '@models/UserToken';

import { bindMethods } from '../bindMethods';
import { ErrorTypes } from '../error';
import { Unauthorized, UnauthorizedErrorTitles } from '../error/Unauthorized';

export class Web3Utils {
  private message: string;
  private signature: string;
  private signerAddress: string;
  private userToken?: UserToken;

  constructor(
    message: string,
    signature: string,
    signerAddress: string,
    userToken: UserToken,
  ) {
    Object.assign(this, { message, signature, signerAddress, userToken });
    bindMethods(this);
  }

  verifyMissingParams() {
    const requiredParams = ['signature', 'signerAddress', 'message', 'userToken'];
    const isMissingParams = requiredParams.some(param => !this?.[param]);

    if (isMissingParams) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_AUTH_PARAMS,
        detail: 'Missing required params for authentication',
      });
    }

    return this;
  }

  verifySignature() {
    const decodedAddress = Signer.recoverAddress(
      hashMessage(this.message),
      this.signature,
    ).bech32Address;

    const addressMatches = decodedAddress === this.signerAddress;

    if (!addressMatches) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.INVALID_ADDRESS,
        detail: 'Invalid credentials',
      });
    }

    return this;
  }

  verifyExpiredToken() {
    const isExpired = isPast(this.userToken.expired_at);

    if (isExpired) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.ACCESS_TOKEN_EXPIRED,
        detail: 'The provided token is expired, please sign in again',
      });
    }

    return this;
  }
}
