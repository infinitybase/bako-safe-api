import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { Network, TransactionRequestLike } from 'fuels';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { UnloggedRequest } from '@src/middlewares/auth/types';
import { DApp, Predicate, User } from '@src/models';

export interface IDAPPCreatePayload {
  sessionId: string;
  name: string;
  origin: string;
  vaults: Predicate[];
  currentVault: Predicate;
  user: User;
  network: Network;
}

export interface IDAPPCreateRecoverCode {
  vaultId: string;
  txId: string;
}
export interface IDAPPConfirmTx {
  sessionId: string;
  vaultAddress: string;
  code: string;
  tx: TransactionRequestLike;
}

export interface IDAPPChangeNetwork {
  sessionId: string;
  newNetwork: Network;
  origin: string;
}

interface ICreateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Omit<
    IDAPPCreatePayload,
    'vaults' | 'currentVault' | 'user'
  > & {
    vaultId: string;
    userAddress: string;
    request_id: string;
  };
  [ContainerTypes.Headers]: {
    origin: string;
  };
}

interface ICreateRecoverCodeSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    sessionId: string;
    vaultAddress: string;
    txId: string;
  };
}

interface IConfirmTx extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IDAPPConfirmTx;
  [ContainerTypes.Headers]: {
    origin: string;
  };
}

interface IChangeNetork extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IDAPPChangeNetwork;
}

export interface IDAPPUser {
  id: string;
  address: string;
  avatar: string;
}

export interface IDappFilterParams {
  sessionId?: string;
  origin?: string;
}

export interface IDAppsService {
  create: (payload: IDAPPCreatePayload) => Promise<DApp>;
  findBySessionID: (sessionID: string, origin: string) => Promise<DApp>;
  findCurrent: (sessionID: string) => Promise<string>;
  updateNetwork: (payload: IDAPPChangeNetwork) => Promise<Network>;
}

interface IDappRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { sessionId: string };
  [ContainerTypes.Headers]: { origin?: string; Origin?: string };
}

export type ICreateRecoverCodeRequest = UnloggedRequest<ICreateRecoverCodeSchema>;
export type IConfirmTxRequest = AuthValidatedRequest<IConfirmTx>;
export type ICreateRequest = AuthValidatedRequest<ICreateRequestSchema>;
export type IDappRequest = AuthValidatedRequest<IDappRequestSchema>;
export type IChangeNetworkRequest = AuthValidatedRequest<IChangeNetork>;
