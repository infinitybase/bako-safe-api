import { PredicateDepositData } from "../types";

export interface IDepositTransactionServices<T> {
  createDepositTransaction(predicate_id: string, transaction: PredicateDepositData): Promise<T>
  createAllDepositTransactions(predicate_id: string, transactions: PredicateDepositData[]): Promise<T>
}