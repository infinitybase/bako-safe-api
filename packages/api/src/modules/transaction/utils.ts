import { Predicate, Transaction, TransactionType } from '@src/models';
import { IPagination } from '@src/utils/pagination';
import {
  ICreateTransactionPayload,
  ITransactionResponse,
  ITransactionsGroupedByMonth,
} from './types';
import { IDeposit } from '../predicate/types';
import { TransactionStatus } from 'bakosafe';
import { TransactionResult } from 'fuels';
import { formatAssets } from '@src/utils/formatAssets';
import { IOrdination } from '@src/utils/ordination/helper';

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

const convertToArray = (groupedData: { [key: string]: ITransactionResponse[] }) => {
  return Object.keys(groupedData).map(monthYear => ({
    monthYear,
    transactions: groupedData[monthYear],
  }));
};

export const groupedTransactions = (
  transactions: IPagination<ITransactionResponse> | ITransactionResponse[],
): IPagination<ITransactionsGroupedByMonth> | ITransactionsGroupedByMonth => {
  const transactionArray: ITransactionResponse[] = Array.isArray(transactions)
    ? transactions
    : transactions.data;

  const groupedData = transactionArray.reduce((acc, transaction) => {
    const options = { year: 'numeric', month: 'long' } as const;
    const monthYear = transaction.createdAt.toLocaleDateString('en-US', options);

    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(transaction);
    return acc;
  }, {} as { [key: string]: ITransactionResponse[] });

  const groupedArray = convertToArray(groupedData);

  if (!Array.isArray(transactions)) {
    return {
      currentPage: transactions.currentPage,
      totalPages: transactions.totalPages,
      nextPage: transactions.nextPage,
      prevPage: transactions.prevPage,
      perPage: transactions.perPage,
      total: transactions.total,
      data: groupedArray,
    };
  }

  // Caso a resposta não seja uma paginação, retornar com mesmo formato de uma.
  return {
    currentPage: 1,
    totalPages: 1,
    nextPage: null,
    prevPage: null,
    perPage: transactionArray.length,
    total: transactionArray.length,
    data: groupedArray,
  };
};

export const formatPayloadToCreateTransaction = (
  deposit: IDeposit,
  predicate: Predicate,
  address: string,
): ICreateTransactionPayload => {
  const formattedAssets = deposit.operations
    .map(operation =>
      operation.assetsSent.map(asset => ({
        to: operation.from.address,
        assetId: asset.assetId,
        //@ts-ignore
        amount: asset.amount.format(),
      })),
    )
    .flat();

  const payload = {
    txData: deposit.txData,
    type: TransactionType.DEPOSIT,
    name: `DEPOSIT_${deposit.id}`,
    hash: deposit.id.slice(2),
    sendTime: deposit.date,
    gasUsed: deposit.gasUsed,
    predicateId: predicate.id,
    predicateAddress: address,
    status: TransactionStatus.SUCCESS,
    resume: {
      hash: deposit.id,
      status: TransactionStatus.SUCCESS,
      witnesses: [],
      requiredSigners: predicate.minSigners,
      totalSigners: predicate.members.length,
      predicate: {
        id: predicate.id,
        address: predicate.predicateAddress,
      },
      id: '',
    },
    assets: formattedAssets,
    predicate,
    createdBy: predicate.owner,
    summary: null,
  };

  return payload;
};

export const formatFuelTransaction = (
  tx: TransactionResult,
  predicate: Predicate,
): ITransactionResponse => {
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

  const formattedTransaction = {
    id: tx.id,
    name: `DEPOSIT_${tx.id}`, // TODO: change this
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
    summary: null,
    gasUsed: tx.gasUsed.format(),
    resume: {
      hash: tx.id,
      status: TransactionStatus.SUCCESS,
      witnesses: [],
      requiredSigners: predicate.minSigners,
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
      minSigners: predicate.minSigners,
      predicateAddress: predicate.predicateAddress,
      members: predicate.members,
      workspace: {
        id: predicate.workspace.id,
        name: predicate.workspace.name,
        single: predicate.workspace.single,
      },
    },
    assets: formatAssets(outputs),
  };

  return (formattedTransaction as unknown) as ITransactionResponse;
};

export const mergeTransactionLists = (
  bakoList: IPagination<ITransactionResponse> | ITransactionResponse[],
  fuelList: ITransactionResponse[],
  ordination: IOrdination<Transaction>,
  perPage?: number,
): IPagination<ITransactionResponse> | ITransactionResponse[] => {
  const isArray = Array.isArray(bakoList);
  const bakoListArray: ITransactionResponse[] = isArray ? bakoList : bakoList.data;
  const _bakoList = new Set(bakoListArray.map(tx => tx.hash));
  const missingTxs = fuelList.filter(tx => !_bakoList.has(tx.hash));
  const mergedList = [...bakoListArray, ...missingTxs];
  const sortedList = sortTransactions(mergedList, ordination);
  const list = perPage ? sortedList.slice(0, perPage) : sortedList;
  const result = isArray ? list : { ...bakoList, data: list };

  return result;
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
