import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { Workspace } from '@src/models/Workspace';

import { Encoder } from '@models/UserToken';
import { IUserPermissions, TypeUser, User, WebAuthn } from '@models/index';

import { AuthValidatedRequest, UnloggedRequest } from '@middlewares/auth/types';


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
  encoder: Encoder;
  signature: string;
  digest: string;
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
  signature?: string;
}

export type IWorkspaceSignin = {
  id: string;
  name: string;
  avatar: string;
  single: boolean;
  description: string;
  permissions: IUserPermissions;
};

export type IUserSignin = {
  user_id: string;
  name: string;
  type: TypeUser;
  avatar: string;
  address: string;
  rootWallet: string;
  webauthn?: WebAuthn;
};

export interface ISignInResponse extends IUserSignin {
  expired_at: Date;
  accessToken: string;
  workspace: IWorkspaceSignin;
}

export interface IUpgradeWorkspace extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    workspace: string;
    user: string;
  };
}

export interface ICreateRecoverCodeRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    address: string;
  };
}

export type IListRequest = AuthValidatedRequest<IListRequestSchema>;
export type ISignInRequest = UnloggedRequest<ISignInRequestSchema>;
export type IGoToSingleWorkspaceRequest = AuthValidatedRequest<ValidatedRequestSchema>;
export type IFindDappRequest = AuthValidatedRequest<IFindDappRequestSchema>;
export type IActiveSession = AuthValidatedRequest<IActiveSessionRequestSchema>;
export type IChangeWorkspaceRequest = AuthValidatedRequest<IUpgradeWorkspace>;
export type IAuthorizeDappRequest = AuthValidatedRequest<IAuthorizeDappRequestSchema>;
export type ICreateRecoverCodeRequest = UnloggedRequest<ICreateRecoverCodeRequestSchema>;

export interface IAuthService {
  signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse>;
  signOut(user: User): Promise<void>;
  // findToken(params: IFindTokenParams): Promise<UserToken | undefined>;
}
