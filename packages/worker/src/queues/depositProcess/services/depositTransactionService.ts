import { DepositTransactionRepository } from "../repositories/depositTransactionRepository";
import { PredicateDepositData } from "../types";
import { IDepositTransactionServices } from "./IDepositTransationService";

export class DepositTransactionService implements IDepositTransactionServices<PredicateDepositData> {
  constructor(private readonly depositTransactionRepository: DepositTransactionRepository) {}

  async createDepositTransaction(predicate_id: string, transaction: PredicateDepositData) {
    return this.depositTransactionRepository.createDepositTransaction(predicate_id, transaction);
  }

  async createAllDepositTransactions(predicate_id: string, transactions: PredicateDepositData[]) {
    return await this.depositTransactionRepository.createAllDepositTransactions(predicate_id, transactions);
  }
}
