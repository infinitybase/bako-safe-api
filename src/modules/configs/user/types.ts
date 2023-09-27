import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { Languages, User } from '@src/models';
import Role from '@src/models/Role';
import { IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

export interface IUserPayload {
  name: string;
  email: string;
  password?: string;
  active?: boolean;
  language: Languages;
  role: Role;
  address: string;
  provider: string;
}

export interface IFilterParams {
  user: string;
  active: boolean;
}

interface ICreateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IUserPayload;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    user: string;
    active: boolean;
    page: string;
    perPage: string;
    sort: 'ASC' | 'DESC';
    orderBy: 'name' | 'createdAt' | 'role';
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
  [ContainerTypes.Body]: IUserPayload;
}

export type ICreateRequest = AuthValidatedRequest<ICreateRequestSchema>;

export type IListRequest = AuthValidatedRequest<IListRequestSchema>;

export type IFindOneRequest = AuthValidatedRequest<IFindOneRequestSchema>;

export type IUpdateRequest = AuthValidatedRequest<IUpdateRequestSchema>;

export type IDeleteRequest = AuthValidatedRequest<IFindOneRequestSchema>;

export interface IUserService {
  filter(filter: IFilterParams): this;
  paginate(pagination: PaginationParams): this;
  ordination(ordination: IOrdination<User>): this;
  find(): Promise<IPagination<User> | User[]>;
  create(payload: IUserPayload): Promise<User>;
  findOne(id: string): Promise<User>;
  update(id: string, payload: IUserPayload): Promise<User>;
  delete(id: string): Promise<boolean>;
}
