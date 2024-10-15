import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import { PermissionRoles, Predicate, User } from '@src/models';

export interface IPredicatePermissionMiddlewareOptions {
  predicateSelector: (
    req: Request,
  ) => { predicateAddress: string } | { id: string };
  permissions: PermissionRoles[];
}

export interface IPredicatesPermissionMiddlewareOptions {
  predicatesSelector: (req: Request) => string[] | undefined;
  permissions: PermissionRoles[];
}

const hasPermission = (
  user: User,
  predicate: Predicate,
  permissions: PermissionRoles[],
) => {
  const isOwner = permissions.includes(PermissionRoles.OWNER)
    ? predicate.owner.id === user.id
    : false;

  const isSigner = permissions.includes(PermissionRoles.SIGNER)
    ? JSON.parse(predicate.configurable).SIGNERS.includes(user.address)
    : false;

  return isOwner || isSigner;
};

export const predicatePermissionMiddleware = (
  options: IPredicatePermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const predicateFilter = options.predicateSelector(req);

      if (!predicateFilter || !Object.values(predicateFilter)[0]) return next();

      const { user }: IAuthRequest = req;

      const predicate = await Predicate.createQueryBuilder('p')
        .leftJoin('p.owner', 'owner')
        .select(['p.configurable', 'owner.id'])
        .where(predicateFilter)
        .getOne();

      const [key, value] = Object.entries(predicateFilter)[0];

      if (!predicate) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Predicate not found',
          detail: `Predicate with ${key} ${value} not found`,
        });
      }

      if (!hasPermission(user, predicate, options.permissions)) {
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

export const predicatesPermissionMiddleware = (
  options: IPredicatesPermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const predicateIds = options.predicatesSelector(req);

      if (!predicateIds || predicateIds.length === 0) {
        return next();
      }

      const { user }: IAuthRequest = req;

      const predicates = await Predicate.createQueryBuilder('p')
        .leftJoin('p.owner', 'owner')
        .select(['p.id', 'p.configurable', 'owner.id'])
        .where('p.id IN (:...predicateIds)', {
          predicateIds,
        })
        .getMany();

      if (predicates.length > 0) {
        predicates.forEach(predicate => {
          if (!hasPermission(user, predicate, options.permissions)) {
            throw new Unauthorized({
              type: ErrorTypes.Unauthorized,
              title: UnauthorizedErrorTitles.INVALID_PERMISSION,
              detail: 'You do not have permission to access this resource',
            });
          }
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
