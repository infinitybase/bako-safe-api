import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Base, Transaction } from '@models/index';

export type IAddTransactionPayload = Omit<Transaction, keyof Base>;
export type ICloseTransactionPayload = {
  gasUsed: string;
  status: 'PENDING' | 'DONE' | 'AWAIT';
  sendTime: Date;
  resume: string;
};

export type ICloseTransactionBody = {
  gasUsed: string;
  transactionResult: string;
};

export interface ISignerByIdPayload {
  signer: string;
  account: string;
}

export const allowedStatus = ['PENDING', 'DONE', 'AWAIT'];

interface IAddTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IAddTransactionPayload;
}
interface ICloseTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICloseTransactionBody;
  [ContainerTypes.Params]: { id: string };
}

interface ISignerByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ISignerByIdPayload;
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

export type IAddTransactionRequest = AuthValidatedRequest<IAddTransactionRequestSchema>;
export type ICloseTransactionRequest = AuthValidatedRequest<ICloseTransactionRequestSchema>;
export type ISignerByIdRequest = AuthValidatedRequest<ISignerByIdRequestSchema>;
export type IFindTransactionByIdRequest = AuthValidatedRequest<IFindTransactionByIdRequestSchema>;
export type IFindTransactionByPredicateIdRequest = AuthValidatedRequest<IFindTransactionByPredicateIdRequestSchema>;
export type IFindTransactionByToRequest = AuthValidatedRequest<IFindTransactionByToRequestSchema>;

export interface ITransactionService {
  add: (payload: IAddTransactionPayload) => Promise<Transaction>;
  findAll: () => Promise<IPagination<Transaction> | Transaction[]>;
  findById: (id: string) => Promise<Transaction>;
  findByPredicateId: (
    predicateId: string,
  ) => Promise<IPagination<Transaction> | Transaction[]>;
  findByTo: (to: string) => Promise<IPagination<Transaction> | Transaction[]>;
  close: (id: string, payload: ICloseTransactionPayload) => Promise<Transaction>;
  signerByID: (id: string, payload: ISignerByIdPayload) => Promise<Transaction>;
  ordination(ordination?: IOrdination<Transaction>): this;
  paginate(pagination?: PaginationParams): this;
}
