import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { Workspace } from '@src/models/Workspace';

import { Encoder } from '@models/UserToken';
import { IPermissions, UserSettings, User, WebAuthn } from '@models/index';

import { AuthValidatedRequest, UnloggedRequest } from '@middlewares/auth/types';
import { Network } from 'fuels';
import { TypeUser } from 'bakosafe';

export interface ICreateUserTokenPayload {
  user: User;
  token: string;
  payload: string;
  expired_at: Date;
  encoder: Encoder;
  network: Network;
  workspace: Workspace;
}

export interface ISignInPayload {
  encoder: Encoder;
  signature: string;
  digest: string;
  userAddress?: string;
  name?: string;
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
  permissions: IPermissions;
};

export type IUserSignin = {
  user_id: string;
  name: string;
  type: TypeUser;
  avatar: string;
  address: string;
  rootWallet: string;
  webauthn?: WebAuthn;
  email?: string;
  network: Network;
  notify: boolean;
  settings?: UserSettings;
};

export interface ISignInResponse extends IUserSignin {
  expired_at: Date;
  accessToken: string;
  workspace: IWorkspaceSignin;
  first_login: boolean;
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
    networkUrl: string;
  };
}

export interface IChangeNetworkRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    network: string;
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
export type IChangenetworkRequest = AuthValidatedRequest<IChangeNetworkRequest>;

export interface IAuthService {
  signIn(payload: ICreateUserTokenPayload): Promise<ISignInResponse>;
  signOut(user: User): Promise<void>;
  // findToken(params: IFindTokenParams): Promise<UserToken | undefined>;
}
