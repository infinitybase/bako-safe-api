import { DepositTransactionRepository } from '../repositories/depositTransactionRepository'
import { DepositTransactionService } from '../services/depositTransactionService'
import { PsqlClient } from "@/clients";

export class DepositTransactionsFactory {
  constructor() {}

  static async getInstance(client: PsqlClient) {
    const depositTransactionRepository = new DepositTransactionRepository(client)
    const depositTransactionService = new DepositTransactionService(depositTransactionRepository)
    return depositTransactionService
  }
} 