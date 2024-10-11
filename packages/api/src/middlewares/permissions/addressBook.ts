import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../auth/types';
import {
  ErrorTypes,
  NotFound,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import AddressBook from '@src/models/AddressBook';

export interface IAddressBookPermissionMiddlewareOptions {
  addressBookSelector: (req: Request) => string;
}

export const addressBookPermissionMiddleware = (
  options: IAddressBookPermissionMiddlewareOptions,
) => {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const addressBookId = options.addressBookSelector(req);

      if (!addressBookId) return next();

      const { user }: IAuthRequest = req;

      const addressBook = await AddressBook.findOne({
        where: { id: addressBookId },
        relations: ['owner', 'owner.owner'],
        select: {
          id: true,
          owner: {
            id: true,
            owner: {
              id: true,
            },
          },
        },
      });

      if (!addressBook) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'Address book not found',
          detail: `Address book with id ${addressBookId} not found`,
        });
      }

      if (addressBook.owner.owner.id !== user.id) {
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
