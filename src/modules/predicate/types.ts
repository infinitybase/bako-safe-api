import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Base, Predicate } from '@models/index';

export enum OrderBy {
  name = 'name',
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export type ICreatePredicatePayload = Omit<Predicate, keyof Base>;
export type IUpdatePredicatePayload = Partial<Predicate>;
export interface IPredicateFilterParams {
  address?: string;
  signer?: string;
  provider?: string;
  owner?: string;
}

interface ICreatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreatePredicatePayload;
}

interface IUpdatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IUpdatePredicatePayload;
  [ContainerTypes.Params]: { id: string };
}

interface IDeletePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    address: string;
    signer: string;
    provider: string;
    owner: string;
    orderBy: OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

export type ICreatePredicateRequest = AuthValidatedRequest<ICreatePredicateRequestSchema>;
export type IUpdatePredicateRequest = AuthValidatedRequest<IUpdatePredicateRequestSchema>;
export type IDeletePredicateRequest = AuthValidatedRequest<IDeletePredicateRequestSchema>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export interface IPredicateService {
  ordination(ordination?: IOrdination<Predicate>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IPredicateFilterParams): this;

  create: (payload: ICreatePredicatePayload) => Promise<Predicate>;
  update: (id: string, payload: IUpdatePredicatePayload) => Promise<Predicate>;
  delete: (id: string) => Promise<boolean>;
  findById: (id: string) => Promise<Predicate>;
  list: () => Promise<IPagination<Predicate> | Predicate[]>;
}
