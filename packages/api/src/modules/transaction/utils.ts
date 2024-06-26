import { Predicate, Transaction, TransactionType } from '@src/models';
import { IPagination } from '@src/utils/pagination';
import { ITCreateService, ITransactionsGroupedByMonth } from './types';
import { IDeposit } from '../predicate/types';
import { TransactionStatus } from 'bakosafe';

const convertToArray = (groupedData: { [key: string]: Transaction[] }) => {
  return Object.keys(groupedData).map(monthYear => ({
    monthYear,
    transactions: groupedData[monthYear],
  }));
};

export const groupedTransactions = (
  transactions: IPagination<Transaction> | Transaction[],
): IPagination<ITransactionsGroupedByMonth> | ITransactionsGroupedByMonth => {
  const transactionArray: Transaction[] = Array.isArray(transactions)
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
  }, {} as { [key: string]: Transaction[] });

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
): ITCreateService => {
  const payload = {
    txData: deposit.txData,
    type: TransactionType.DEPOSIT,
    // verificar name e hash, esse são valores provisórios
    name: `DEPOSIT_${deposit.id}`,
    hash: deposit.id,
    sendTime: deposit.date,
    gasUsed: deposit.gasUsed,
    predicateId: predicate.id,
    status: TransactionStatus.SUCCESS,
    resume: {
      hash: deposit.id,
      status: TransactionStatus.SUCCESS,
      witnesses: [predicate.owner.address],
      outputs: deposit.operations.map(({ assetsSent, to, from }) => ({
        // @ts-ignore
        amount: String(assetsSent[0].amount.format()),
        to: to.address,
        from,
        assetId: assetsSent[0].assetId,
      })),
      requiredSigners: predicate.minSigners,
      totalSigners: predicate.members.length,
      predicate: {
        id: predicate.id,
        address: predicate.predicateAddress,
      },
      BakoSafeID: '',
    },
    assets: deposit.operations.map(({ assetsSent, to, from }) => ({
      // @ts-ignore
      amount: String(assetsSent[0].amount.format()),
      to: to.address,
      from,
      assetId: assetsSent[0].assetId,
    })),
    witnesses: [
      {
        ...predicate.owner,
        account: predicate.owner.id,
        createdAt: deposit.date,
      },
    ],
    predicate,
    createdBy: predicate.owner,
    summary: null,
  };

  return payload;
};
