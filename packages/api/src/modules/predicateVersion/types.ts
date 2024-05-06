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
  code?: string;
  active?: boolean;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
    code: string;
    active: boolean;
    orderBy: OrderBy | IDefaultOrdination;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

interface IFindByCodeRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    code: string;
  };
}

export type IListRequest = UnloggedRequest<IListRequestSchema>;
export type IFindByCodeRequest = UnloggedRequest<IFindByCodeRequestSchema>;

export interface IPredicateVersionService {
  ordination(ordination?: IOrdination<PredicateVersion>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IPredicateVersionFilterParams): this;

  list: () => Promise<IPagination<PredicateVersion> | PredicateVersion[]>;
  findByCode: (code: string) => Promise<PredicateVersion>;
  findCurrentVersion: () => Promise<PredicateVersion>;
}
