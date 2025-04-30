import { TransactionPagination } from ".";
import { formatTransactionsResponse, handleInternalError } from "../utils";
import { TransactionRepository } from "../repositories/transactionRepository";

export const paginateTransactions = async (perPage?: number, offsetDb: number = 0, filter?: any): Promise<any> => {
  try {
    const repository = new TransactionRepository(filter);
    const query = repository.buildQuery();
    const result = await TransactionPagination.create(query).paginate({ perPage: perPage.toString(), offset: offsetDb.toString() });
    return formatTransactionsResponse(result);
  } catch (e) {
    handleInternalError(e, 'transactions');
  }
}