import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, User } from '@models/index';

export enum OrderBy {
  name = 'name',
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface IPredicatePayload {
  name: string;
  description: string;
  predicateAddress: string;
  minSigners: number;
  addresses?: string[];
  owner: string;
  bytes: string;
  abi: string;
  configurable: string;
  provider: string;
  chainId?: number;
  user: User;
  members?: User[];
}

export interface IPredicateMemberPayload {
  user_id: string;
  predicate_id: string;
}

export interface IPredicateFilterParams {
  q?: string;
  address?: string;
  signer?: string;
  provider?: string;
  owner?: string;
}

interface ICreatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IPredicatePayload;
}

interface IUpdatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IPredicatePayload;
  [ContainerTypes.Params]: { id: string };
}

interface IDeletePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}
interface IFindByHashRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { address: string };
}
interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
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
export type IFindByHashRequest = AuthValidatedRequest<IFindByHashRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export interface IPredicateService {
  ordination(ordination?: IOrdination<Predicate>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IPredicateFilterParams): this;

  create: (payload: IPredicatePayload) => Promise<Predicate>;
  update: (id: string, payload: IPredicatePayload) => Promise<Predicate>;
  delete: (id: string) => Promise<boolean>;
  findById: (id: string, signer: string) => Promise<Predicate>;
  list: () => Promise<IPagination<Predicate> | Predicate[]>;
}
