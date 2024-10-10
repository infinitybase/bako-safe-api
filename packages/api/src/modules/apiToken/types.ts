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

export interface ICLIToken {
  apiToken: string;
  userId: string;
}

export interface ICLIAuthPayload {
  token: string;
  network: {
    chainId: number;
    url: string;
  };
}

export type IDeleteAPITokenPayload = IDefaultAPITokenParams;
export type IListAPITokenPayload = Pick<IDefaultAPITokenParams, 'predicateId'>;

interface ICreateAPITokenRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: Pick<IDefaultAPITokenParams, 'predicateId'>;
  [ContainerTypes.Body]: ICreateAPITokenPayload;
}

interface ICLIAuthRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICLIAuthPayload;
}

export type ICreateAPITokenRequest = AuthValidatedRequest<ICreateAPITokenRequestSchema>;
export type ICLIAuthRequest = AuthValidatedRequest<ICLIAuthRequestSchema>;

export interface ITokenCoder<D> {
  encode(...data: string[]): string;
  decode(data: string): D;
}

export interface IAPITokenService {
  create(payload: Partial<APIToken>): Promise<APIToken>;
  delete(params: IDeleteAPITokenPayload): Promise<void>;
  list(params: IListAPITokenPayload): Promise<APIToken[]>;

  decodeCLIToken(token: string): ICLIToken;
  generateCLIToken(apiToken: string, userId: string): string;
}
