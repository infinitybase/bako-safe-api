import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { Transaction, User } from '@src/models';
import {
  ProviderData,
  RampTransaction,
  RampTransactionProvider,
} from '@src/models/RampTransactions';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

export interface ICreatePayload {
  provider: RampTransactionProvider;
  providerData: ProviderData;
  transaction?: Transaction;
  user: User;
  sourceCurrency?: string;
  sourceAmount?: string;
  destinationCurrency?: string;
  destinationAmount?: string;
  paymentMethod?: string;
  userWalletAddress?: string;
  isSandbox: boolean;
}

export interface IRampTransactionService {
  create: (payload: ICreatePayload) => Promise<RampTransaction>;
  findById: (id: string) => Promise<RampTransaction>;
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
}

export type IFindRampTransactionByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
