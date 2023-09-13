import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';

import { Base, Transaction } from '@models/index';

export type IAddTransactionPayload = Omit<Transaction, keyof Base>;
export type ICloseTransactionPayload = Pick<
  Transaction,
  'status' | 'sendTime' | 'gasUsed' | 'resume'
>;

export const allowedStatus = ['PENDING', 'DONE', 'AWAIT'];

interface IAddTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IAddTransactionPayload;
}
interface ICloseTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICloseTransactionPayload;
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
export type IFindTransactionByIdRequest = AuthValidatedRequest<IFindTransactionByIdRequestSchema>;
export type IFindTransactionByPredicateIdRequest = AuthValidatedRequest<IFindTransactionByPredicateIdRequestSchema>;
export type IFindTransactionByToRequest = AuthValidatedRequest<IFindTransactionByToRequestSchema>;

export interface ITransactionService {
  add: (payload: IAddTransactionPayload) => Promise<Transaction>;
  findAll: () => Promise<Transaction[]>;
  findById: (id: number) => Promise<Transaction>;
  findByPredicateId: (predicateId: number) => Promise<Transaction[]>;
  findByTo: (to: string) => Promise<Transaction[]>;
  close: (id: number, payload: ICloseTransactionPayload) => Promise<Transaction>;
  ordination(ordination: IOrdination<Transaction>): this;
}
