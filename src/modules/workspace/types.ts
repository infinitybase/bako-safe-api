import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IPermissions, PermissionRoles, Workspace } from '@src/models/Workspace';
import { IOrdination } from '@src/utils/ordination';
import { PaginationParams, IPagination } from '@src/utils/pagination';

export interface IFilterParams {
  q?: string;
  user?: string;
  single?: boolean;
  owner?: string;
  id?: string;
}

export interface IWorkspacePayload {
  name: string;
  members?: string[];
  description?: string;
  avatar?: string;
  single?: boolean;
  permissions?: IPermissions;
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    user: string;
    single: boolean;
    owner: string;
    page: string;
    perPage: string;
    sort: 'ASC' | 'DESC';
    orderBy: 'name' | 'createdAt';
  };
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface ICreateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IWorkspacePayload;
}

interface IUpdateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Pick<IWorkspacePayload, 'name' | 'avatar' | 'description'>;
  [ContainerTypes.Params]: { id: string };
}

interface IUpdateMembersRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string; member: string };
}

interface IUpdatePermissionsRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    permissions: {
      [key in PermissionRoles]: string[];
    };
  };
  [ContainerTypes.Params]: { id: string; member: string };
}

export type IListByUserRequest = AuthValidatedRequest<IListRequestSchema>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
export type ICreateRequest = AuthValidatedRequest<ICreateRequestSchema>;
export type IUpdateRequest = AuthValidatedRequest<IUpdateRequestSchema>;
export type IUpdateMembersRequest = AuthValidatedRequest<IUpdateMembersRequestSchema>;
export type IUpdatePermissionsRequest = AuthValidatedRequest<IUpdatePermissionsRequestSchema>;

export interface IWorkspaceService {
  ordination(ordination?: IOrdination<Workspace>): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IFilterParams): this;

  create: (payload: Partial<Partial<Workspace>>) => Promise<Workspace>;
  //update: (id: string, payload: IUpdatePayload) => Promise<Workspace>;
  list: () => Promise<IPagination<Workspace> | Workspace[]>;
  //   findById: (id: string) => Promise<Workspace>;
}
