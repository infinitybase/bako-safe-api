import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import AddressBook from '@src/models/AddressBook';

import { User } from '@models/index';

import { AuthValidatedRequest } from '@middlewares/auth/types';

import { IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';

export enum OrderBy {
  nickname = 'nickname',
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface ICreateAddressBookPayload {
  nickname: string;
  address: string;
  user_id?: string;
  createdBy: User;
}

export type IUpdateAddressBookPayload = Omit<
  ICreateAddressBookPayload,
  'createdBy'
>;

export interface IFilterAddressBookParams {
  q?: string;
  createdBy?: string;
  contactAddress?: string;
  nickname?: string;
}

interface ICreateAddressBookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreateAddressBookPayload;
}

interface IUpdateAddressBookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IUpdateAddressBookPayload;
  [ContainerTypes.Params]: { id: string };
}

interface IDeleteAddressBookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IListAddressBookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
    createdBy: string;
    orderBy: OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

export type ICreateAddressBookRequest = AuthValidatedRequest<ICreateAddressBookRequestSchema>;
export type IUpdateAddressBookRequest = AuthValidatedRequest<IUpdateAddressBookRequestSchema>;
export type IDeleteAddressBookRequest = AuthValidatedRequest<IDeleteAddressBookRequestSchema>;
export type IListAddressBookRequest = AuthValidatedRequest<IListAddressBookRequestSchema>;

export interface IAddressBookService {
  ordination(ordination?: IOrdination<AddressBook>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IFilterAddressBookParams): this;

  create: (payload: ICreateAddressBookPayload) => Promise<AddressBook>;
  update: (id: string, payload: IUpdateAddressBookPayload) => Promise<AddressBook>;
  delete: (id: string) => Promise<boolean>;
  list: () => Promise<IPagination<AddressBook> | AddressBook[]>;
}
