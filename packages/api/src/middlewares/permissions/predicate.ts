import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import { Predicate } from '@src/models';

export interface IPredicatePermissionMiddlewareOptions {
  predicateSelector: (
    req: Request,
  ) => { predicateAddress: string } | { id: string };
}

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

      const signers = JSON.parse(predicate.configurable).SIGNERS;

      if (predicate.owner.id !== user.id && !signers.includes(user.address)) {
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
