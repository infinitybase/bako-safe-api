import { Base, Witness } from '@src/models';
import { IOrdination } from '@src/utils/ordination';
import { PaginationParams } from '@src/utils/pagination';

export type ICreateWitnessPayload = Omit<Witness, keyof Base>;
export type IUpdateWitnessPayload = Partial<ICreateWitnessPayload>;

export interface IWitnessService {
  create: (payload: ICreateWitnessPayload) => Promise<Witness>;
  update: (id: string, payload: IUpdateWitnessPayload) => Promise<Witness>;
  findById: (id: string) => Promise<Witness>;
  ordination(ordination?: IOrdination<Witness>): this;
  paginate(pagination?: PaginationParams): this;
}
