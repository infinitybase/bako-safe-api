import { RecoverCode, RecoverCodeType } from '@src/models';

export interface ICreateRecoverCodePayload {
  type: RecoverCodeType;
  origin: string;
  validAt: Date;
}

export interface IRecoverCodeService {
  create: (payload: ICreateRecoverCodePayload) => Promise<RecoverCode>;
  update: (id: string, payload: Partial<RecoverCode>) => Promise<RecoverCode>;
  findByCode: (code: string) => Promise<RecoverCode>;
}
