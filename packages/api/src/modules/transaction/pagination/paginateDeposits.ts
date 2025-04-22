import { TransactionPagination } from ".";
import { formatTransactionsResponse, handleInternalError } from "../utils";
import { DepositsTransactionRepository } from "../repositories/depositsTransactionRepository";

export const paginateDeposits = async (perPage?: number, offsetFuel: number = 0, filter?: any): Promise<any> => {
  try {
    const repository = new DepositsTransactionRepository(filter);
    const query = repository.buildQuery();
    const result = await TransactionPagination.create(query).paginate({ perPage: perPage.toString(), offset: offsetFuel.toString() });
    return formatTransactionsResponse(result);
  } catch (e) {
    handleInternalError(e, 'deposits');
  }
}