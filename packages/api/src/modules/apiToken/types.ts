import { APIToken, Predicate } from '@src/models';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { AuthValidatedRequest } from '@middlewares/auth/types';

export interface ICreateAPITokenPayload {
  name: string;
  config?: { transactionTitle: string };
}

interface ICreateAPITokenRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreateAPITokenPayload;
}

export type ICreateAPITokenRequest = AuthValidatedRequest<ICreateAPITokenRequestSchema>;

export interface IAPITokenService {
  create(payload: Partial<APIToken>): Promise<APIToken>;
  generateUserToken(apiToken: string, userId: string): string;
}
