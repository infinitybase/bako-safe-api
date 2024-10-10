import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import { Transaction } from '@src/models';

export interface ITransactionPermissionMiddlewareOptions {
  transactionSelector: (req: Request) => string;
}

export const transactionPermissionMiddleware = (
  options: ITransactionPermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const { user }: IAuthRequest = req;

      const transactionHash = options.transactionSelector(req);

      const transaction = await Transaction.createQueryBuilder('t')
        .select('t.resume')
        .where('t.hash = :hash', { hash: transactionHash })
        .getOne();

      if (!transaction) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Transaction not found',
          detail: `Transaction with hash ${transactionHash} not found`,
        });
      }

      if (
        transaction.resume.witnesses.every(
          witness => witness.account !== user.address,
        )
      ) {
        throw new Unauthorized({
          type: ErrorTypes.Unauthorized,
          title: UnauthorizedErrorTitles.INVALID_PERMISSION,
          detail: `User with id ${user.id} is not allowed to execute action related to transaction with hash ${transactionHash}`,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
