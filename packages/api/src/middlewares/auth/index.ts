import { Request, Response, NextFunction } from 'express';

import { PermissionRoles } from '@src/models/Workspace';
import { validatePermissionGeneral } from '@src/utils/permissionValidate';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

import { IAuthRequest } from './types';
import { AuthStrategyFactory } from './methods';

const { AUTH_POINTS } = process.env;

async function authMiddleware(
  req: IAuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const signature = req?.headers?.authorization;

    if (!signature) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Some required credentials are missing',
      });
    }

    const authStrategy = AuthStrategyFactory.createStrategy(signature);
    const { user, workspace, network } = await authStrategy.authenticate(req);

    req.user = user;
    req.workspace = workspace;
    req.network = network;

    return next();
  } catch (e) {
    return next(e);
  }
}

//todo: if required permission to specific vault, check on request this vault ID
function authPermissionMiddleware(permission?: PermissionRoles[]) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const requestAuth: IAuthRequest = req;

      if (!permission || permission.length === 0) return next();
      const { user, workspace } = requestAuth;

      // if not required info
      if (!user || !workspace) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
          detail: 'Some required credentials are missing',
        });
      }

      // if not required premission info
      if (!workspace.permissions[user.id]) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.MISSING_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      }

      if (validatePermissionGeneral(workspace, user.id, permission)) return next();

      // if not required premissions
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_PERMISSION,
        detail: 'You do not have permission to access this resource',
      });
    } catch (e) {
      return next(e);
    }
  };
}

function authPointsMiddleware(
  req: IAuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req?.headers?.authorization;

    console.debug('~ points middleware debug', authorization)
    console.debug('~ points middleware debug, env auth', AUTH_POINTS)
    console.debug('~ points middleware debug, comparison result', AUTH_POINTS === authorization)

    if (!authorization || authorization !== AUTH_POINTS) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Some required credentials are missing',
      });
    }

    return next();
  } catch (e) {
    return next(e);
  }
}

export { authMiddleware, authPermissionMiddleware, authPointsMiddleware };
