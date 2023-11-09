import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { User, DApp, Predicate } from '@src/models';

export interface IDAPPCreatePayload {
  sessionId: string;
  origin: string;
  vaultId: string;
  name?: string;
}

export interface IDAPPUser {
  id: string;
  address: string;
  avatar: string;
}
interface ICreateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { sessionId: string };
  [ContainerTypes.Body]: IDAPPCreatePayload;
}

//export type ICreateDappRequest = SocketValidateRequest<ICreateRequestSchema>;

export interface IDAppsService {
  create: (payload: {
    sessionId: string;
    name: string;
    origin: string;
    vaults: Predicate[];
  }) => Promise<DApp>;
  findBySessionID: (sessionID: string) => Promise<DApp>;
  checkExist: (address: string, sessionId: string, url: string) => Promise<DApp>;
}
