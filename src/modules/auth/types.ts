import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import UserToken, { Encoder } from '@models/UserToken';
import { User } from '@models/index';

import { AuthValidatedRequest } from '@middlewares/auth/types';

export interface ICreateUserTokenPayload {
  token: string;
  user: User;
  expired_at: Date;
  encoder: Encoder;
  provider: string;
  payload: string;
}

export interface ISignInPayload {
  address: string;
  hash: string;
  createdAt: Date;
  encoder: Encoder;
  provider: string;
  signature: string;
  user_id: string;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    user: string;
    active: boolean;
    page: string;
    perPage: string;
    sort: 'ASC' | 'DESC';
    orderBy: 'name' | 'createdAt' | 'role';
  };
}

interface ISignInRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ISignInPayload;
}

export interface IFindTokenParams {
  userId?: string;
  signature?: string;
}

export interface ISignInResponse {
  accessToken: string;
  avatar: string;
}

export type ISignInRequest = AuthValidatedRequest<ISignInRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export interface IAuthService {
  signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse>;
  signOut(user: User): Promise<void>;
  findToken(params: IFindTokenParams): Promise<UserToken | undefined>;
}
