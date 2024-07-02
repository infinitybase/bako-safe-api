import { Request, Response, NextFunction } from 'express';

import { RecoverCode, RecoverCodeType } from '@src/models';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import { validatePermissionGeneral } from '@src/utils/permissionValidate';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

import { IAuthRequest } from './types';
import { AuthStrategyFactory } from './methods';

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
    const { user, workspace } = await authStrategy.authenticate(req);

    req.user = user;
    req.workspace = workspace;

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

      // DEBUG VALIDATIONS
      // const myValidation = `${req.method}-${req.baseUrl}${req.path}`;
      // const combination = 'POST-/predicate/';

      // if (combination === myValidation) {
      //   console.log('[validacao]: ', {
      //     //workspace: workspace.permissions,
      //     user: {
      //       id: user.id,
      //       name: user.name,
      //       address: user.address,
      //     },
      //     permission: permission,
      //     user_p: workspace.permissions[user.id],
      //     validations: {
      //       a: !!workspace.permissions[user.id],
      //       b: permission.length === 0,
      //       c: permission.filter(p =>
      //         workspace.permissions[user.id][p].includes('*'),
      //       ),
      //     },
      //   });
      // }

      if (validatePermissionGeneral(workspace, user.id, permission)) return next();

      // if not required premissions
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_PERMISSION,
        detail: 'You do not have permission to access this resource',
      });
    } catch (e) {
      return next(e);
      //return e;
    }
  };
}

export { authMiddleware, authPermissionMiddleware };
