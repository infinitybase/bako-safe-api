import { Request, Response, NextFunction } from 'express';

import { Predicate } from '@src/models';
import { PermissionRoles } from '@src/models/Workspace';
import { PredicateService } from '@src/modules/predicate/services';

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

//todo: if required permission to specific vault, check on request this vault ID
function authPermissionMiddleware(permission?: PermissionRoles[]) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const requestAuth: IAuthRequest = req;

      console.log('[REQUEST]: ', {
        base_url: req.baseUrl,
        url: req.url,
        path: req.path,
        route_path: req.route.path,
        method: req.method,
      });

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

      //verifica se o usuário tem acesso full, dependendo da permissao solicitada
      // console.log(
      //   '[VALIDACAO_1]: ',
      //   permission.find(p => workspace.permissions[user.id][p][0] === '*'),
      //   workspace.permissions[user.id],
      //   user.id,
      // );
      if (permission.find(p => workspace.permissions[user.id][p][0] === '*'))
        return next();

      /**
       * verifica a combinacao endpoint + metodo
       * devolve um item do objeto criado para tratar separadamente cada caso de validacao
       * [key: function(req, permissions, user, workspace)] -> [`${req.method}_${req.path}`] -> fn(req, permissions, user, workspace): true | false
       * recebendo true[valido] ou false[invalido] retorna o next() ou throw new Unauthorized
       */

      //validate permissions
      if (!permission.includes(PermissionRoles.SIGNER)) {
        // console.log(
        //   '[ENTROU AQUI]: ',
        //   permission,
        //   JSON.stringify(workspace.permissions),
        //   workspace.permissions[user.id],
        //   user.id,
        // );
        const isValid = permission.filter(
          p => workspace.permissions[user.id][p][0] === '*',
        );
        if (isValid.length > 0) return next();
      }

      // if not required premissions
      throw new Unauthorized({
        type: ErrorTypes.Unauthorized,
        title: UnauthorizedErrorTitles.MISSING_PERMISSION,
        detail: 'You do not have permission to access this resource',
      });

      //return next();
    } catch (e) {
      console.log('[ERRO]: ', e);
      return next(e);
    }
  };
}

export { authMiddleware, authPermissionMiddleware };
