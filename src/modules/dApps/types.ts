import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { User, DApp, Predicate } from '@src/models';

export interface IDAPPCreatePayload {
  sessionId: string;
  name: string;
  origin: string;
  vaults: Predicate[];
  currentVault: Predicate;
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
}

interface IDappRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { sessionId: string };
  [ContainerTypes.Headers]: { origin?: string; Origin?: string };
}

export type IDappRequest = AuthValidatedRequest<IDappRequestSchema>;
