import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest, UnloggedRequest } from '@src/middlewares/auth/types';
import { UserSettings, TransactionType, TypeUser, User } from '@src/models';
import { IDefaultOrdination, IOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';
import { Maybe } from '@src/utils/types/maybe';

export interface IWebAuthnSignUp {
  id: string;
  publicKey: string;
  origin: string;
  hardware: string;
  predicate_id?: string;
  predicate_address?: string;
}

export interface IUserPayload {
  name: string;
  type: TypeUser;
  address: string;
  provider: string;
  avatar?: string;
  webauthn?: IWebAuthnSignUp;
  settings?: UserSettings;
}

export interface IFilterParams {
  user?: string;
  active?: boolean;
  nickname?: string;
  address?: string;
  workspace?: string;
  type?: TransactionType;
}

export interface IFindByNameResponse {
  webAuthnId: string;
}

export interface IValidateNameResponse {
  type: TypeUser;
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
    orderBy: 'name' | IDefaultOrdination;
    type: TransactionType;
  };
}

interface IFindOneRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
}

interface IFindByNameRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    name: string;
  };
}

interface ICheckNickname extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    nickname: string;
  };
  [ContainerTypes.Query]: {
    userId: string;
  };
}

interface ICheckHardware extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    hardware: string;
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

export type IMeRequest = AuthValidatedRequest<IListRequestSchema>;

export type IFindByNameRequest = UnloggedRequest<IFindByNameRequestSchema>;

export type ICheckNicknameRequest = UnloggedRequest<ICheckNickname>;

export type ICheckHardwareRequest = UnloggedRequest<ICheckHardware>;

export type IMeInfoRequest = AuthValidatedRequest<null>;

export interface IUserService {
  filter(filter: IFilterParams): this;
  paginate(pagination: PaginationParams): this;
  ordination(ordination: IOrdination<User>): this;
  find(): Promise<IPagination<User> | User[]>;
  create(payload: IUserPayload): Promise<User>;
  findOne(id: string): Promise<User>;
  findByAddress(address: string): Promise<User | undefined>;
  findByName(name: string): Promise<Maybe<IFindByNameResponse>>;
  randomAvatar(): Promise<string>;
  update(id: string, payload: IUserPayload): Promise<User>;
  delete(id: string): Promise<boolean>;
  tokensUSDAmount(): Promise<[string, number][]>;
  validateName(
    name: string,
    userId?: string,
  ): Promise<Maybe<IValidateNameResponse>>;
  listAll(): Promise<IPagination<User>>;
}
