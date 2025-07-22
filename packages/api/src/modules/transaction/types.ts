import {
  ITransactionResume,
  ITransactionSummary,
  ITransferAsset,
  IWitnesses,
  TransactionStatus,
} from 'bakosafe';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { Network, Receipt, TransactionRequest } from 'fuels';

import {
  Predicate,
  Transaction,
  TransactionStatusWithRamp,
  TransactionType,
  TypeUser,
} from '@models/index';

import { AuthValidatedRequest } from '@middlewares/auth/types';

import { IOrdination } from '@utils/ordination';
import { IPagination, PaginationParams } from '@utils/pagination';
import { TransactionPaginationParams } from './pagination';

export interface ITransactionCounter {
  DB: number;
  FUEL: number;
}

export enum OrderBy {
  name = 'name',
  status = 'status',
}

export enum Sort {
  asc = 'ASC',
  desc = 'DESC',
}

export enum TransactionHistory {
  FAILED = 'FAILED',
  CREATED = 'CREATED',
  SIGN = 'SIGNATURE',
  DECLINE = 'DECLINE',
  CANCEL = 'CANCEL',
  SEND = 'SEND',
}

export interface ITransactionHistory {
  type: TransactionHistory;
  date: string;
  owner: {
    id: string;
    avatar: string;
    address: string;
    type: TypeUser;
  };
}

export interface ITransactionResponse extends Transaction {
  assets: ITransferAsset[];
}

export interface ICreateTransactionPayload {
  name: string;
  hash: string;
  predicateAddress: string;
  status: TransactionStatus | TransactionStatusWithRamp;
  txData: TransactionRequest;
  assets: {
    assetId: string;
    amount: string;
    to: string;
  }[];
  resume?: ITransactionResume;
  sendTime?: Date;
  gasUsed?: string;
  predicateID?: string;
  summary?: ITransactionSummary;
}

export interface IUpdateTransactionPayload {
  name?: string;
  status?: TransactionStatus;
  resume?: ITransactionResume;
  sendTime?: Date;
  gasUsed?: string;
  hash?: string;
}

export type ICloseTransactionPayload = {
  gasUsed: string;
  status: TransactionStatus;
  sendTime: Date;
  resume: ITransactionResume;
};

export interface ITransactionFilterParams {
  predicateId?: string[];
  predicateAddress?: string;
  signer?: string; // address of logged user
  workspaceId?: string[];
  to?: string;
  hash?: string;
  status?: TransactionStatus[];
  name?: string;
  limit?: number;
  allOfUser?: boolean;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  id?: string;
  type?: TransactionType;
  network?: string;
}

export interface ITransactionsListParams {
  ordination?: IOrdination<Transaction>;
  perPage?: string;
  offsetDb?: string;
  offsetFuel?: string;
}

export type ICloseTransactionBody = {
  gasUsed: string;
  transactionResult: ITransactionResume;
  hasError: boolean;
};

export interface ISignByIdPayload {
  signature: string;
  approve: string;
}

export interface ITransactionAdvancedDetail {
  status: TransactionStatus;
  txRequest: TransactionRequest;
  receipts?: Receipt[];
}

interface ICreateTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICreateTransactionPayload;
}

interface ICreateTransactionHistoryRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string; predicateId: string };
}

interface IUpdateTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Omit<IUpdateTransactionPayload, 'hash'>;
  [ContainerTypes.Params]: { id: string };
}

interface IDeleteTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface ICloseTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ICloseTransactionBody;
  [ContainerTypes.Params]: { id: string };
}

interface ICancelTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { hash: string };
}

interface ISendTransactionRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { hash: string };
}

interface ISignByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ISignByIdPayload;
  [ContainerTypes.Params]: { hash: string };
}

interface IFindTransactionByIdRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { id: string };
}

interface IFindTransactionByHashRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { hash: string };
  [ContainerTypes.Query]: { status?: TransactionStatus[] };
}

interface IFindTransactionByPredicateIdRequestSchema
  extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { predicateId: string };
}

interface IFindTransactionByToRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: { to: string };
}
interface IListRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    status: TransactionStatus[];
    name: string;
    allOfUser: boolean;
    predicateId: string[];
    to: string;
    startDate: string;
    endDate: string;
    createdBy: string;
    orderBy: OrderBy;
    sort: Sort;
    page: string;
    perPage: string;
    limit: number;
    id: string;
    type: TransactionType;
  };
}

interface IListWithIncomingsRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    status: TransactionStatus[];
    predicateId: string[];
    orderBy: OrderBy;
    sort: Sort;
    perPage?: string;
    type: TransactionType;
    offsetDb?: string;
    offsetFuel?: string;
    id?: string;
  };
}

export type ITCreateService = Partial<Transaction>;

export type ICreateTransactionRequest = AuthValidatedRequest<ICreateTransactionRequestSchema>;
export type ICreateTransactionHistoryRequest = AuthValidatedRequest<ICreateTransactionHistoryRequestSchema>;
export type IUpdateTransactionRequest = AuthValidatedRequest<IUpdateTransactionRequestSchema>;
export type IDeleteTransactionRequest = AuthValidatedRequest<IDeleteTransactionRequestSchema>;
export type ICloseTransactionRequest = AuthValidatedRequest<ICloseTransactionRequestSchema>;
export type ICancelTransactionRequest = AuthValidatedRequest<ICancelTransactionRequestSchema>;
export type ISendTransactionRequest = AuthValidatedRequest<ISendTransactionRequestSchema>;
export type ISignByIdRequest = AuthValidatedRequest<ISignByIdRequestSchema>;
export type IFindTransactionByIdRequest = AuthValidatedRequest<IFindTransactionByIdRequestSchema>;
export type IFindTransactionByHashRequest = AuthValidatedRequest<IFindTransactionByHashRequestSchema>;
export type IFindTransactionByPredicateIdRequest = AuthValidatedRequest<IFindTransactionByPredicateIdRequestSchema>;
export type IFindTransactionByToRequest = AuthValidatedRequest<IFindTransactionByToRequestSchema>;
export type IListRequest = AuthValidatedRequest<IListRequestSchema>;
export type IListWithIncomingsRequest = AuthValidatedRequest<IListWithIncomingsRequestSchema>;

export interface ITransactionService {
  ordination(ordination?: IOrdination<Transaction>): this;
  paginate(pagination?: PaginationParams): this;
  transactionPaginate(pagination?: TransactionPaginationParams): this;
  filter(filter: ITransactionFilterParams): this;

  // bakosafe
  sendToChain: (
    transactionId: string,
    network: Network,
  ) => Promise<ITransactionResponse>;

  // crud
  create: (payload: ITCreateService) => Promise<ITransactionResponse>;
  update: (
    id: string,
    payload: IUpdateTransactionPayload,
  ) => Promise<ITransactionResponse>;
  list: () => Promise<IPagination<ITransactionResponse> | ITransactionResponse[]>;
  listWithIncomings: () => Promise<ITransactionResponse[]>;
  findById: (id: string) => Promise<ITransactionResponse>;
  findByHash: (hash: string) => Promise<ITransactionResponse>;
  delete: (id: string) => Promise<boolean>;
  findAdvancedDetailById(id: string): Promise<ITransactionAdvancedDetail>;

  // graphql
  fetchFuelTransactions: (
    predicates: Predicate[],
    providerUrl: string,
  ) => Promise<ITransactionResponse[]>;
  fetchFuelTransactionById: (
    id: string,
    predicate: Predicate,
    providerUrl: string,
  ) => Promise<ITransactionResponse>;

  // validations
  validateStatus: (
    transaction: Transaction,
    witnesses: IWitnesses[],
  ) => TransactionStatus;
  checkInvalidConditions: (api_transaction: TransactionStatus) => void;
  validateSignature: (transaction: Transaction, userAddress: string) => boolean;
  listAll(): Promise<IPagination<Transaction>>;
}
