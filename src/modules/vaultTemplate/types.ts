import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import VaultTemplate from '@src/models/VaultTemplate';

import { User } from '@models/index';

import { AuthValidatedRequest } from '@middlewares/auth/types';

import { IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';

export enum OrderBy {
  name = 'name',
  creation = 'createdAt',
  update = 'updatedAt',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface ICreatePayload {
  name: string;
  description: string;
  minSigners: number;
  signers: string;
  createdBy: User;
}

export interface IUpdatePayload {
  name?: string;
  description?: string;
  minSigners?: number;
  signers?: string;
}

export interface IFilterParams {
  q?: string;
  user?: User;
}

interface ICreateVaultTemplate extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Omit<ICreatePayload, 'user'>;
}

interface IUpdateVaultTemplate extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IUpdatePayload;
  [ContainerTypes.Params]: { id: string };
}

interface IListVaultTemplate extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
    orderBy: OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
  };
}

interface IFindByIdVaultTemplate extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
}

export type ICreateVaultTemplateRequest = AuthValidatedRequest<ICreateVaultTemplate>;
export type IUpdateVaultTemplateRequest = AuthValidatedRequest<IUpdateVaultTemplate>;
export type ILisVaultTemplatetRequest = AuthValidatedRequest<IListVaultTemplate>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdVaultTemplate>;

export interface IVaultTemplateService {
  ordination(ordination?: IOrdination<VaultTemplate>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IFilterParams): this;

  create: (payload: ICreatePayload) => Promise<VaultTemplate>;
  update: (id: string, payload: IUpdatePayload) => Promise<VaultTemplate>;
  list: () => Promise<IPagination<VaultTemplate> | VaultTemplate[]>;
  findById: (id: string) => Promise<VaultTemplate>;
}
