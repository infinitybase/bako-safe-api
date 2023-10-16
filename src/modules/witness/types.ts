import { Witness, WitnessesStatus } from '@src/models';

export interface ICreateWitnessPayload {
  signature?: string;
  account: string;
  transactionID: string;
}

export interface IUpdateWitnessPayload {
  signature?: string;
  status: WitnessesStatus;
}

export interface IWitnessService {
  create: (payload: ICreateWitnessPayload) => Promise<Witness>;
  update: (id: string, payload: IUpdateWitnessPayload) => Promise<Witness>;
  findById: (id: string) => Promise<Witness>;
  list: () => Promise<Witness[]>;
  findByTransactionId: (
    transactionId: string,
    isSigned?: boolean,
  ) => Promise<Witness[]>;
}
