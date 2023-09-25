import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { Asset, Transaction, TransactionStatus } from '@models/index';

import { AuthValidatedRequest } from '@middlewares/auth/types';

import { IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';

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

export interface ICreateTransactionPayload {
  predicateAdress: string;
  predicateID?: string;
  name: string;
  txData: string;
  hash: string;
  status: TransactionStatus;
  assets: Asset[];
}

export interface IUpdateTransactionPayload {
  name?: string;
  status?: TransactionStatus;
  resume?: string;
  sendTime?: Date;
  gasUsed?: string;
}

export type ICloseTransactionPayload = {
  gasUsed: string;
  status: TransactionStatus;
  sendTime: Date;
  resume: string;
};

export interface ITransactionFilterParams {
  predicateId?: string;
  to?: string;
  hash?: string;
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

interface IUpdateTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IUpdateTransactionPayload;
  [ContainerTypes.Params]: { id: string };
}

interface IDeleteTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
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

interface IFindTransactionByHashRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { hash: string };
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
export type IUpdateTransactionRequest = AuthValidatedRequest<IUpdateTransactionRequestSchema>;
export type IDeleteTransactionRequest = AuthValidatedRequest<IDeleteTransactionRequestSchema>;
export type ICloseTransactionRequest = AuthValidatedRequest<ICloseTransactionRequestSchema>;
export type ISignByIdRequest = AuthValidatedRequest<ISignByIdRequestSchema>;
export type IFindTransactionByIdRequest = AuthValidatedRequest<IFindTransactionByIdRequestSchema>;
export type IFindTransactionByHashRequest = AuthValidatedRequest<IFindTransactionByHashRequestSchema>;
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
  delete: (id: string) => Promise<boolean>;
}
