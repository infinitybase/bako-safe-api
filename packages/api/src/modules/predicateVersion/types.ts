import { UnloggedRequest } from '@src/middlewares/auth/types';
import { PredicateVersion } from '@src/models';
import { IDefaultOrdination, IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

export enum OrderBy {
  name = 'name',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface IPredicateVersionFilterParams {
  q?: string;
  rootAddress?: string;
  active?: boolean;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
    rootAddress: string;
    active: boolean;
    orderBy: OrderBy | IDefaultOrdination;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

interface IFindByRootAddressRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    rootAddress: string;
  };
}

export type IListRequest = UnloggedRequest<IListRequestSchema>;
export type IFindByRootAddressRequest = UnloggedRequest<IFindByRootAddressRequestSchema>;

export interface IPredicateVersionService {
  ordination(ordination?: IOrdination<PredicateVersion>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IPredicateVersionFilterParams): this;

  list: () => Promise<IPagination<PredicateVersion> | PredicateVersion[]>;
  findByRootAddress: (rootAddress: string) => Promise<PredicateVersion>;
  findCurrentVersion: () => Promise<PredicateVersion>;
}
