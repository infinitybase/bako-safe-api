import { Vault, Workspace } from 'bakosafe';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';
import { IDefaultOrdination } from '@src/utils/ordination';
import { IPagination, PaginationParams } from '@src/utils/pagination';

import { Predicate, User } from '@models/index';
import { IAssetMapById } from '@src/utils';
import { BN, Network } from 'fuels';
import { IPredicateOrdination } from './ordination';

export enum OrderBy {
  name = 'name',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export interface IPredicatePayload {
  name: string;
  description: string;
  predicateAddress: string;
  // minSigners: number;
  root?: boolean;
  configurable: string;
  version?: string;
  versionCode?: string;
  owner?: User;
  members?: User[];
  workspace?: Workspace;
  isHidden?: boolean;
}

export interface IPredicateMemberPayload {
  user_id: string;
  predicate_id: string;
}

export interface IPredicateFilterParams {
  q?: string;
  name?: string;
  address?: string;
  signer?: string;
  provider?: string;
  owner?: string;
  workspace?: string[];
  ids?: string[];
  select?: string[];
  settings?: string[];
  hidden?: boolean;
  userId?: string;
}

export interface IGetTxEndCursorQueryProps {
  providerUrl: string;
  address: string;
  txQuantityRange: number;
}

export interface IEndCursorPayload {
  data: {
    transactionsByOwner: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
    };
  };
}
export interface AssetAllocation {
  assetId: string;
  amount: BN;
  amountInUSD: number;
  percentage: number;
}
export interface IPredicateAllocation {
  data: AssetAllocation[];
  totalAmountInUSD: number;
}

export interface IPredicateAllocationParams {
  user: User;
  predicateId?: string;
  network: Network;
  assetsMap: IAssetMapById;
}

interface ICreatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IPredicatePayload;
}

interface ITooglePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { address: string };
}

interface IUpdatePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Pick<IPredicatePayload, 'name' | 'description'>;
  [ContainerTypes.Params]: { predicateId: string };
}

interface IDeletePredicateRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { predicateId: string };
}
interface IFindByHashRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { address: string };
}

interface IFindByNameRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    name: string;
  };
  [ContainerTypes.Query]: {
    ignoreId?: string;
  };
}

interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q: string;
    ids: string[];
    address: string;
    signer: string;
    provider: string;
    owner: string;
    orderByRoot: string;
    orderBy: IDefaultOrdination | OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
    hidden?: boolean;
  };
}

interface IGetAllocationRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    predicateId: string;
  };
}

export type ICreatePredicateRequest = AuthValidatedRequest<ICreatePredicateRequestSchema>;
export type ITooglePredicateRequest = AuthValidatedRequest<ITooglePredicateRequestSchema>;
export type IUpdatePredicateRequest = AuthValidatedRequest<IUpdatePredicateRequestSchema>;
export type IDeletePredicateRequest = AuthValidatedRequest<IDeletePredicateRequestSchema>;
export type IFindByIdRequest = AuthValidatedRequest<IFindByIdRequestSchema>;
export type IFindByHashRequest = AuthValidatedRequest<IFindByHashRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;
export type IFindByNameRequest = AuthValidatedRequest<IFindByNameRequestSchema>;
export type PredicateWithHidden = Omit<
  Predicate,
  | 'isHiddenForUser'
  | 'insertCreatedAtAndUpdatedAt'
  | 'insertUpdatedAt'
  | 'hasId'
  | 'save'
  | 'remove'
  | 'softRemove'
  | 'recover'
  | 'reload'
> & {
  isHidden: boolean;
};
export type IGetAllocationRequest = AuthValidatedRequest<IGetAllocationRequestSchema>;

export interface IPredicateService {
  ordination(ordination?: IPredicateOrdination): this;
  paginate(pagination?: PaginationParams): this;
  filter(filter: IPredicateFilterParams): this;

  create: (
    payload: IPredicatePayload,
    network: Network,
    user: User,
    workspace: Workspace,
  ) => Promise<Predicate>;
  update: (id: string, payload?: Partial<IPredicatePayload>) => Promise<Predicate>;
  delete: (id: string) => Promise<boolean>;
  findById: (id: string, signer?: string) => Promise<Predicate>;
  list: () => Promise<IPagination<Predicate> | Predicate[]>;
  findByAddress: (address: string) => Promise<Predicate>;
  instancePredicate: (
    configurable: string,
    provider: string,
    version?: string,
  ) => Promise<Vault>;
  listDateMoreThan(d: Date): Promise<IPagination<Predicate>>;
  togglePredicateStatus: (
    userId: string,
    address: string,
    authorization: string,
  ) => Promise<string[]>;
  allocation: (params: IPredicateAllocationParams) => Promise<IPredicateAllocation>;
}
