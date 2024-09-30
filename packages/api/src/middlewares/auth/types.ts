import { Request } from 'express';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { ParsedQs } from 'qs';

import { Workspace } from '@src/models/Workspace';

import UserToken from '@models/UserToken';
import { User } from '@models/index';
import { Network } from 'fuels';

export interface AuthValidatedRequest<T extends ValidatedRequestSchema>
  extends Request {
  body: T[ContainerTypes.Body];
  query: T[ContainerTypes.Query] & ParsedQs;
  headers: T[ContainerTypes.Headers];
  params: T[ContainerTypes.Params];
  accessToken?: string;
  user?: User;
  userToken?: UserToken;
  workspace?: Workspace;
  network?: Network;
}

export interface UnloggedRequest<T extends ValidatedRequestSchema> extends Request {
  body: T[ContainerTypes.Body];
  query: T[ContainerTypes.Query] & ParsedQs;
  headers: T[ContainerTypes.Headers];
}

export type IAuthRequest = AuthValidatedRequest<ValidatedRequestSchema>;
export type IChangeWorkspaceRequest = AuthValidatedRequest<ValidatedRequestSchema>;
