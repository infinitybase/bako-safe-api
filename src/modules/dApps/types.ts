import { User, DApp } from '@src/models';

export interface IDAPPCreatePayload {
  sessionId: string;
  name: string;
  url: string;
  users: User;
}

export interface IDAPPUser {
  id: string;
  address: string;
  avatar: string;
}

export interface IDAppsService {
  create: (payload: IDAPPCreatePayload) => Promise<DApp>;
  findBySessionID: (sessionID: string) => Promise<DApp>;
  checkExist: (address: string, sessionId: string, url: string) => Promise<DApp>;
}
