import { RecoverCode, RecoverCodeType, User, DApp } from '@src/models';
import { Network } from 'fuels';
import { Request } from 'express';

export interface ICreateRecoverCodePayload {
  owner: User;
  type: RecoverCodeType;
  origin: string;
  validAt: Date;
  metadata?: { [key: string]: string | number | boolean | object };
  network: Network;
}

export interface IRecoverCodeService {
  create: (payload: ICreateRecoverCodePayload) => Promise<RecoverCode>;
  update: (id: string, payload: Partial<RecoverCode>) => Promise<RecoverCode>;
  findByCode: (code: string) => Promise<RecoverCode>;
}

export interface ICreateRecoverCodeRequest extends Request {
  body: Record<string, unknown>;
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  user?: User;
  dapp?: DApp;
}
