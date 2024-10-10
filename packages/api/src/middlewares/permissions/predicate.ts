import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import { Predicate, User } from '@src/models';

export interface IPredicatePermissionMiddlewareOptions {
  predicateSelector: (
    req: Request,
  ) => { predicateAddress: string } | { id: string };
}

export interface IPredicatesPermissionMiddlewareOptions {
  predicatesSelector: (req: Request) => string[] | undefined;
}

const hasPermission = (user: User, predicate: Predicate) => {
  const signers = JSON.parse(predicate.configurable).SIGNERS;
  return predicate.owner.id !== user.id && !signers.includes(user.address);
};

export const predicatePermissionMiddleware = (
  options: IPredicatePermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const { user }: IAuthRequest = req;

      const predicateFilter = options.predicateSelector(req);

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

      if (hasPermission(user, predicate)) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: `User with id ${user.id} is not allowed to execute action related to vault with ${key} ${value}`,
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
      const { user }: IAuthRequest = req;

      const predicateIds = options.predicatesSelector(req);

      if (!predicateIds || predicateIds.length === 0) {
        return next();
      }

      const predicates = await Predicate.createQueryBuilder('p')
        .leftJoin('p.owner', 'owner')
        .select(['p.id', 'p.configurable', 'owner.id'])
        .where('p.id IN (:...predicateIds)', {
          predicateIds,
        })
        .getMany();

      if (predicates.length > 0) {
        predicates.forEach(predicate => {
          if (hasPermission(user, predicate)) {
            throw new Unauthorized({
              type: ErrorTypes.Unauthorized,
              title: UnauthorizedErrorTitles.INVALID_PERMISSION,
              detail: `User with id ${user.id} is not allowed to execute action related to vault with id ${predicate.id}`,
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
