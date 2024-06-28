import { APIToken } from '@src/models';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { AuthValidatedRequest } from '@middlewares/auth/types';

export interface ICreateAPITokenPayload {
  name: string;
  config?: { transactionTitle: string };
}

export interface IDefaultAPITokenParams {
  predicateId: string;
  id: string;
}

export type IDeleteAPITokenPayload = IDefaultAPITokenParams;
export type IListAPITokenPayload = Pick<IDefaultAPITokenParams, 'predicateId'>;

interface ICreateAPITokenRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: Pick<IDefaultAPITokenParams, 'predicateId'>;
  [ContainerTypes.Body]: ICreateAPITokenPayload;
}

export type ICreateAPITokenRequest = AuthValidatedRequest<ICreateAPITokenRequestSchema>;

export interface IAPITokenService {
  create(payload: Partial<APIToken>): Promise<APIToken>;
  delete(params: IDeleteAPITokenPayload): Promise<void>;
  list(params: IListAPITokenPayload): Promise<APIToken[]>;

  generateUserToken(apiToken: string, userId: string): string;
}
