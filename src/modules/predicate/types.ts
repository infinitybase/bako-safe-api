import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';

import { Predicate, Base } from '@models/index';

export type IAddPredicatePayload = Omit<Predicate, keyof Base>;

interface IAddPredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IAddPredicatePayload;
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindByAdressesRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: { adresses: string[] };
}

export type IAddPredicateRequest = AuthValidatedRequest<IAddPredicateRequestSchema>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
export type IFindByAdressesRequest = AuthValidatedRequest<IFindByAdressesRequestSchema>;

export interface IPredicateService {
  add: (payload: IAddPredicatePayload) => Promise<Predicate>;
  findAll: () => Promise<Predicate[]>;
  findById: (id: number) => Promise<Predicate>;
  findByAdresses: (addresses: string[]) => Promise<Predicate>;
  ordination(ordination: IOrdination<Predicate>): this;
}
