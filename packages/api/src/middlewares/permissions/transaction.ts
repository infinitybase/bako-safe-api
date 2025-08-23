import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import { ErrorTypes, NotFound } from '@src/utils/error';
import { Transaction } from '@src/models';

export interface ITransactionPermissionMiddlewareOptions {
  transactionSelector: (req: Request) => string;
}

export const transactionPermissionMiddleware = (
  options: ITransactionPermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const transactionHash = options.transactionSelector(req);
      if (!transactionHash) return next();

      const { user }: IAuthRequest = req;

      const transaction = await Transaction.createQueryBuilder('t')
        .select('t.resume')
        .where('t.hash = :hash', {
          hash: transactionHash.startsWith(`0x`)
            ? transactionHash.slice(2)
            : transactionHash,
        })
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
        // throw new Unauthorized({
        //   type: ErrorTypes.Unauthorized,
        //   title: UnauthorizedErrorTitles.INVALID_PERMISSION,
        //   detail: 'You do not have permission to access this resource',
        // });
      }

      return next();
    } catch (error) {
      console.log(error);
      return next(error);
    }
  };
};
