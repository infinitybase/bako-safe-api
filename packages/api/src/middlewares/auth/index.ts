import { Request, Response, NextFunction } from 'express';
import { request } from 'http';

import { RecoverCode, RecoverCodeType } from '@src/models';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import { TokenUtils } from '@src/utils';
import { validatePermissionGeneral } from '@src/utils/permissionValidate';

import { ErrorTypes } from '@utils/error';
import { Unauthorized, UnauthorizedErrorTitles } from '@utils/error/Unauthorized';

import { IAuthRequest } from './types';

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const requestAuth: IAuthRequest = req;
    const signature = requestAuth?.headers?.authorization;
    const signerAddress = requestAuth.get('signerAddress');
    const isRecoverCode = !!signature && signature.includes('code');

    if (!signature || !signerAddress) {
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Some required credentials are missing',
      });
    }

    if (isRecoverCode) {
      const recover = await RecoverCode.findOne({
        where: {
          code: signature,
          type: RecoverCodeType.AUTH_ONCE,
        },
        relations: ['owner'],
      });

      if (!recover) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_RECOVER_CODE,
          detail: 'The provided recover code is invalid',
        });
      }

      const isOld = recover.validAt < new Date();
      const isUsed = recover.used;

      if (isOld || isUsed) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_RECOVER_CODE,
          detail: 'The provided recover code is expired',
        });
      }

      if (Number(recover.metadata.uses) >= 3) {
        //todo: change this number to dynamic
        recover.used = true;
      }

      recover.metadata.uses = Number(recover.metadata.uses) + 1;
      await recover.save();
      requestAuth.user = recover.owner;
      requestAuth.workspace = await Workspace.findOne({
        where: { owner: recover.owner.id, single: true }, // just single workspace
      });

      return next();
    }

    const token = await TokenUtils.recoverToken(signature);
    await TokenUtils.renewToken(token);

    requestAuth.user = await TokenUtils.checkUserExists(signerAddress);
    requestAuth.userToken = token;
    requestAuth.workspace = await TokenUtils.findLoggedWorkspace(token);

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
