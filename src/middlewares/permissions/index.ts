import { Response, NextFunction } from 'express';

import { UnauthorizedErrorTitles } from '@src/utils/error/Unauthorized';

import { ErrorTypes } from '@utils/error';

import { IAuthRequest } from '../auth/types';
import { Modules } from './types';

function PermissionsMiddleware(module: Modules) {
  return async function (req: IAuthRequest, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const permissions = user.role.permissions;

      if (req.method === 'GET' && !permissions[module].view) {
        return res.status(401).json({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      } else if (req.method === 'DELETE' && !permissions[module].remove) {
        return res.status(401).json({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      } else if (
        ['POST', 'PUT'].indexOf(req.method) >= 0 &&
        !permissions[module].edit
      ) {
        return res.status(401).json({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      }

      return next();
    } catch (e) {
      return next(e);
    }
  };
}

export { PermissionsMiddleware };
