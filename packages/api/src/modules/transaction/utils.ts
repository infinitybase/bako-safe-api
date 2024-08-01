import { Predicate, Transaction, TransactionType } from '@src/models';
import { IPagination } from '@src/utils/pagination';
import { ICreateTransactionPayload, ITransactionsGroupedByMonth } from './types';
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

  const txData = deposit.txData;
  const inputs = Transaction.getInputsFromTransactionRequest(txData);

  const payload = {
    txData,
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
      witnesses: [predicate.owner.address],
      inputs,
      outputs: txData.outputs,
      requiredSigners: predicate.minSigners,
      totalSigners: predicate.members.length,
      predicate: {
        id: predicate.id,
        address: predicate.predicateAddress,
      },
      id: '',
      type: txData.type,
    },
    assets: formattedAssets,
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
