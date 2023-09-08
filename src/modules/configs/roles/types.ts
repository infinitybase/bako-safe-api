import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import Role, { Permissions } from '@src/models/master/Role';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

export interface IRolePayload {
  name: string;
  active?: boolean;
  permissions: Permissions;
}

export interface IFilterParams {
  role: string;
  active: string;
}

interface ICreateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IRolePayload;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    role: string;
    active: string;
    page: string;
    perPage: string;
    sort: 'ASC' | 'DESC';
    orderBy: 'name' | 'createdAt' | 'active';
  };
}

interface IFindOneRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
}

interface IUpdateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
  [ContainerTypes.Body]: IRolePayload;
}

export type ICreateRequest = AuthValidatedRequest<ICreateRequestSchema>;

export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export type IFindOneRequest = AuthValidatedRequest<IFindOneRequestSchema>;

export type IUpdateRequest = AuthValidatedRequest<IUpdateRequestSchema>;

export type IDeleteRequest = AuthValidatedRequest<IFindOneRequestSchema>;

export interface IRoleService {
  filter(filter: IFilterParams): this;
  paginate(pagination: PaginationParams): this;
  ordination(ordination: IOrdination<Role>): this;
  create(payload: IRolePayload): Promise<Role>;
  find(): Promise<IPagination<Role> | Role[]>;
  findOne(id: number): Promise<Role>;
  update(id: number, payload: IRolePayload): Promise<Role>;
  delete(id: number): Promise<boolean>;
}
