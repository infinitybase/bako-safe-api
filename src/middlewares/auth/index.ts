import { Request, Response, NextFunction } from 'express';

import { signOutPath } from '@modules/auth/routes';
import { AuthService } from '@modules/auth/services';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';
import { Web3Utils } from '@utils/web3';

import { IAuthRequest } from './types';

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const requestAuth: IAuthRequest = req;
    const signature = requestAuth?.cookies?.accessToken;
    const signerAddress = requestAuth?.cookies?.signerAddress;
    const isSignOut = requestAuth?.route?.path === signOutPath;
    const authService = new AuthService();

    if (!signature || !signerAddress) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Some required credentials are missing',
      });
    }

    // Busca um user_token vinculado à assinatura
    const userToken = await authService.findToken(signature);

    if (!userToken) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.SESSION_NOT_FOUND,
        detail: 'Could not find a session for the provided signature',
      });
    }

    // Valida se o endereço informado foi o que gerou a assinatura
    const web3Utils = new Web3Utils({
      signature,
      userToken,
      signerAddress,
    }).verifySignature();

    // Se for signOut pula a validação de token expirado
    if (!isSignOut) {
      web3Utils.verifyExpiredToken();
    }

    // Injeta token e user na request
    // requestAuth.accessToken = signature;
    requestAuth.user = userToken.user;

    return next();
  } catch (e) {
    return next(e);
  }
}

export { authMiddleware };
