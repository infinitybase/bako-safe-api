import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Base, Predicate } from '@models/index';

export type IAddPredicatePayload = Omit<Predicate, keyof Base>;

interface IAddPredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IAddPredicatePayload;
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindByAdressesRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { address: string };
}

interface IFindByPredicateAdressRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { predicateAddress: string };
}

export type IAddPredicateRequest = AuthValidatedRequest<IAddPredicateRequestSchema>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
export type IFindByAdressesRequest = AuthValidatedRequest<IFindByAdressesRequestSchema>;
export type IFindByPredicateAdressRequest = AuthValidatedRequest<IFindByPredicateAdressRequestSchema>;

export interface IPredicateService {
  add: (payload: IAddPredicatePayload) => Promise<Predicate>;
  findAll: () => Promise<IPagination<Predicate> | Predicate[]>;
  findById: (id: string) => Promise<Predicate>;
  findByAdresses: (
    addresses: string,
  ) => Promise<IPagination<Predicate> | Predicate[]>;
  findByPredicateAddress: (predicateAddress: string) => Promise<Predicate>;
  ordination(ordination?: IOrdination<Predicate>): this;
  paginate(pagination?: PaginationParams): this;
}
