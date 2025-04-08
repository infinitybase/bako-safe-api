import { Predicate, Transaction, TransactionType, User } from '@src/models';
import { IPagination } from '@src/utils/pagination';
import {
  ITransactionResponse,
  ITransactionsListParams,
  TransactionHistory,
} from './types';
import { TransactionStatus } from 'bakosafe';
import { Provider, TransactionResult } from 'fuels';
import { formatAssets } from '@src/utils/formatAssets';
import {
  IDefaultOrdination,
  IOrdination,
  Sort,
} from '@src/utils/ordination/helper';
import { isUUID } from 'class-validator';
import { ITransactionCounter } from './types';
import { ITransactionPagination } from './pagination';
import { getAssetsMaps } from '@src/utils';
import { PredicateService } from '../predicate/services';

export const formatTransactionsResponse = (
  transactions: IPagination<Transaction> | Transaction[],
): IPagination<ITransactionResponse> | ITransactionResponse[] => {
  if (Array.isArray(transactions)) {
    return transactions.map(Transaction.formatTransactionResponse);
  } else {
    return {
      ...transactions,
      data: transactions.data.map(Transaction.formatTransactionResponse),
    };
  }
};

export const formatFuelTransaction = async (
  tx: TransactionResult,
  predicate: Predicate,
  provider: Provider,
): Promise<ITransactionResponse> => {
  const {
    gasPrice,
    scriptGasLimit,
    script,
    scriptData,
    type,
    witnesses,
    outputs,
    inputs,
  } = tx.transaction;

  const config = JSON.parse(predicate.configurable);
  const chainId = provider.getChainId();

  const formattedTransaction = {
    id: tx.id,
    name: 'Deposit',
    hash: tx.id.slice(2),
    sendTime: tx.date,
    createdAt: tx.date,
    updatedAt: tx.date,
    type: TransactionType.DEPOSIT,
    txData: {
      gasPrice,
      scriptGasLimit,
      script,
      scriptData,
      type,
      witnesses,
      outputs,
      inputs,
    },
    status: TransactionStatus.SUCCESS,
    summary: {
      operations: tx.operations,
    },
    gasUsed: tx.gasUsed.format(),
    resume: {
      hash: tx.id,
      status: TransactionStatus.SUCCESS,
      witnesses: [],
      requiredSigners: config.SIGNATURES_COUNT ?? 1,
      totalSigners: predicate.members.length,
      predicate: {
        id: predicate.id,
        address: predicate.predicateAddress,
      },
      id: tx.id,
    },
    createdBy: predicate.owner,
    predicateId: predicate.id,
    predicate: {
      id: predicate.id,
      name: predicate.name,
      minSigners: config.SIGNATURES_COUNT ?? 1,
      predicateAddress: predicate.predicateAddress,
      members: predicate.members,
      workspace: {
        id: predicate.workspace.id,
        name: predicate.workspace.name,
        single: predicate.workspace.single,
      },
    },
    assets: formatAssets(outputs, predicate.predicateAddress),
    network: {
      url: provider.url,
      chainId,
    },
  };

  return (formattedTransaction as unknown) as ITransactionResponse;
};

export const mergeTransactionLists = (
  dbList:
    | IPagination<ITransactionResponse>
    | ITransactionPagination<ITransactionResponse>
    | ITransactionResponse[],
  fuelList: ITransactionResponse[],
  params: ITransactionsListParams,
): ITransactionPagination<ITransactionResponse> | ITransactionResponse[] => {
  const {
    ordination: { orderBy, sort },
    perPage,
    offsetDb,
    offsetFuel,
  } = params;

  const _ordination = {
    orderBy: orderBy || IDefaultOrdination.UPDATED_AT,
    sort: sort || Sort.DESC,
  };
  const _perPage = perPage ? Number(perPage) : undefined;
  const _offsetDb = offsetDb ? Number(offsetDb) : undefined;
  const _offsetFuel = offsetFuel ? Number(offsetFuel) : undefined;
  const isPaginated = perPage && offsetDb && offsetFuel;

  const dbListArray: ITransactionResponse[] = Array.isArray(dbList)
    ? dbList
    : dbList.data;

  // Filter out deposits that are already in the database
  const filteredFuelList = fuelList.filter(
    tx =>
      !dbListArray.some(
        dbTx => dbTx.hash === tx.hash && dbTx.type === TransactionType.DEPOSIT,
      ),
  );

  const sortedFuelList = sortTransactions(filteredFuelList, _ordination);

  // Keeps the number of transactions according to perPage if paginated
  const _fuelList = isPaginated
    ? sortedFuelList.slice(_offsetFuel, _offsetFuel + _perPage)
    : sortedFuelList;

  const mergedList = sortTransactions([...dbListArray, ..._fuelList], _ordination);
  const list = isPaginated ? mergedList.slice(0, _perPage) : mergedList;

  if (!isPaginated) {
    return list;
  }

  const counter = countTransactionsPerOrigin(list);
  const newOffsetDb = _offsetDb + counter.DB;
  const newOffsetFuel = _offsetFuel + counter.FUEL;

  return {
    data: list,
    perPage: _perPage,
    offsetDb: newOffsetDb,
    offsetFuel: newOffsetFuel,
  };
};

export const sortTransactions = (
  transactions: ITransactionResponse[],
  ordination: IOrdination<Transaction>,
): ITransactionResponse[] => {
  const { orderBy, sort } = ordination;
  const sortedTransactions = transactions.sort((a, b) => {
    let compareValue = 0;

    const aValue = a[orderBy];
    const bValue = b[orderBy];

    switch (orderBy) {
      case 'createdAt':
      case 'updatedAt':
      case 'sendTime':
        compareValue =
          new Date(aValue as string).getTime() -
          new Date(bValue as string).getTime();
        break;
      default:
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          compareValue = aValue.localeCompare(bValue);
        } else {
          compareValue = 0;
        }
        break;
    }

    return sort === 'ASC' ? compareValue : -compareValue;
  });

  return sortedTransactions;
};

const countTransactionsPerOrigin = (
  transactions: ITransactionResponse[],
): ITransactionCounter => {
  return transactions.reduce<ITransactionCounter>(
    (counter, transaction) => {
      if (isUUID(transaction.id)) {
        counter.DB++;
      } else {
        counter.FUEL++;
      }
      return counter;
    },
    { DB: 0, FUEL: 0 },
  );
};

export const createTxHistoryEvent = (
  type: TransactionHistory,
  date: Date | string,
  user: Pick<User, 'id' | 'avatar' | 'address' | 'type'>,
) => ({
  type,
  date,
  owner: {
    id: user.id,
    avatar: user.avatar,
    address: user.address,
    type: user.type,
  },
});
