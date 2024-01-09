import { Request, Response, NextFunction } from 'express';

import { PermissionRoles } from '@src/models/Workspace';

import { signOutPath } from '@modules/auth/routes';
import { AuthService } from '@modules/auth/services';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';
import { Web3Utils } from '@utils/web3';

import { IAuthRequest } from './types';

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const requestAuth: IAuthRequest = req;
    const signature = requestAuth?.headers?.authorization;
    const signerAddress = requestAuth.get('signerAddress');
    const isSignOut = requestAuth?.route?.path === signOutPath;
    const authService = new AuthService();

    if (!signature || !signerAddress) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Some required credentials are missing',
      });
    }

    const userToken = await authService.findToken({ signature });

    if (!userToken) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.SESSION_NOT_FOUND,
        detail: 'Could not find a session for the provided signature',
      });
    }

    const web3Utils = new Web3Utils({
      signature,
      userToken,
      signerAddress,
    }).verifySignature();

    if (!isSignOut) web3Utils.verifyExpiredToken();

    requestAuth.user = userToken.user;
    requestAuth.userToken = userToken;
    requestAuth.workspace = userToken.workspace;

    return next();
  } catch (e) {
    return next(e);
  }
}

function authPermissionMiddleware(permission?: PermissionRoles) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const requestAuth: IAuthRequest = req;

      if (!permission) return next();

      const { user, workspace } = requestAuth;

      if (!user || !workspace) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
          detail: 'Some required credentials are missing',
        });
      }

      const hasPermission = workspace.permissions[user.id][permission];

      if (!hasPermission) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.MISSING_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      }

      return next();
    } catch (e) {
      return next(e);
    }
  };
}

export { authMiddleware, authPermissionMiddleware };
