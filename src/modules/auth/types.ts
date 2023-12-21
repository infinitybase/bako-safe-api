import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { Workspace } from '@src/models/Workspace';

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
  workspace: Workspace;
}

export interface ISignInPayload {
  address: string;
  hash: string;
  createdAt: Date;
  encoder: Encoder;
  provider: string;
  signature: string;
  user_id: string;
  workspace_id?: string;
}

interface IActiveSessionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    sessionId: string;
    address: string;
  };
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

interface IFindDappRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    sessionID: string;
  };
}

interface IAuthorizeDappRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    sessionId: string;
    url: string;
    name: string;
    address: string;
  };
}

export interface IFindTokenParams {
  userId?: string;
  address?: string;
  signature?: string;
  notExpired?: boolean;
}

export interface ISignInResponse {
  accessToken: string;
  avatar: string;
}

export type IActiveSession = AuthValidatedRequest<IActiveSessionRequestSchema>;
export type ISignInRequest = AuthValidatedRequest<ISignInRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;
export type IFindDappRequest = AuthValidatedRequest<IFindDappRequestSchema>;
export type IAuthorizeDappRequest = AuthValidatedRequest<IAuthorizeDappRequestSchema>;

export interface IAuthService {
  signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse>;
  signOut(user: User): Promise<void>;
  findToken(params: IFindTokenParams): Promise<UserToken | undefined>;
}
