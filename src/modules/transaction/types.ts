import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Base, Transaction } from '@models/index';

export const allowedStatus = ['PENDING', 'DONE', 'AWAIT'];

export enum TransactionStatus {
  AWAIT = 'AWAIT',
  DONE = 'DONE',
  PENDING = 'PENDING',
}

export enum OrderBy {
  name = 'name',
  status = 'name',
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export type ICreateTransactionPayload = Omit<Transaction, keyof Base>;
export type IUpdateTransactionPayload = Partial<ICreateTransactionPayload>;
export type ICloseTransactionPayload = {
  gasUsed: string;
  status: TransactionStatus;
  sendTime: Date;
  resume: string;
};

export interface ITransactionFilterParams {
  predicateId?: string;
  to?: string;
}

export type ICloseTransactionBody = {
  gasUsed: string;
  transactionResult: string;
};

export interface ISignByIdPayload {
  signer: string;
  account: string;
}

interface ICreateTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreateTransactionPayload;
}
interface ICloseTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICloseTransactionBody;
  [ContainerTypes.Params]: { id: string };
}

interface ISignByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ISignByIdPayload;
  [ContainerTypes.Params]: { id: string };
}

interface IFindTransactionByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindTransactionByPredicateIdRequestSchema
  extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { predicateId: string };
}

interface IFindTransactionByToRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { to: string };
}
interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    predicateId: string;
    to: string;
    orderBy: OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

export type ICreateTransactionRequest = AuthValidatedRequest<ICreateTransactionRequestSchema>;
export type ICloseTransactionRequest = AuthValidatedRequest<ICloseTransactionRequestSchema>;
export type ISignByIdRequest = AuthValidatedRequest<ISignByIdRequestSchema>;
export type IFindTransactionByIdRequest = AuthValidatedRequest<IFindTransactionByIdRequestSchema>;
export type IFindTransactionByPredicateIdRequest = AuthValidatedRequest<IFindTransactionByPredicateIdRequestSchema>;
export type IFindTransactionByToRequest = AuthValidatedRequest<IFindTransactionByToRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export interface ITransactionService {
  ordination(ordination?: IOrdination<Transaction>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: ITransactionFilterParams): this;

  create: (payload: ICreateTransactionPayload) => Promise<Transaction>;
  update: (id: string, payload: IUpdateTransactionPayload) => Promise<Transaction>;
  list: () => Promise<IPagination<Transaction> | Transaction[]>;
  findById: (id: string) => Promise<Transaction>;
}
