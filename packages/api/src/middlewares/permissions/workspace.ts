import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';

export interface IWorkspacePermissionMiddlewareOptions {
  workspaceSelector: (req: Request) => string;
}

export const workspacePermissionMiddleware = (
  options: IWorkspacePermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const workspaceId = options.workspaceSelector(req);

      if (!workspaceId) return next();

      const { workspace }: IAuthRequest = req;

      if (workspaceId !== workspace.id) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: 'You do not have permission to access this resource',
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
