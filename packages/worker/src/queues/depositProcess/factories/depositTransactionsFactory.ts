import { DepositTransactionRepository } from '../repositories/depositTransactionRepository'
import { DepositTransactionService } from '../services/depositTransactionService'

export class DepositTransactionsFactory {
  constructor() {}

  static async getInstance() {
    const depositTransactionRepository = new DepositTransactionRepository()
    await depositTransactionRepository.init();
    const depositTransactionService = new DepositTransactionService(depositTransactionRepository)
    return depositTransactionService
  }
} 