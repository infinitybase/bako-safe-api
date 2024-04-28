import { DApp, RecoverCode, RecoverCodeType, User } from '@src/models';

export interface ICreateRecoverCodePayload {
  owner: User;
  type: RecoverCodeType;
  origin: string;
  validAt: Date;
  metadata?: { [key: string]: any };
}

export interface IRecoverCodeService {
  create: (payload: ICreateRecoverCodePayload) => Promise<RecoverCode>;
  update: (id: string, payload: Partial<RecoverCode>) => Promise<RecoverCode>;
  findByCode: (code: string) => Promise<RecoverCode>;
}
