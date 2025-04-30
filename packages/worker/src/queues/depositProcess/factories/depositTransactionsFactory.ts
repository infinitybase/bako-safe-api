import { DepositTransactionRepository } from '../repositories/depositTransactionRepository'
import { DepositTransactionService } from '../services/depositTransactionService'
import { getPsqlClientInstance } from '@/database/psqlInstance';

export class DepositTransactionsFactory {
  constructor() {}

  static async getInstance() {
    const psqlClient = await getPsqlClientInstance()

    const depositTransactionRepository = new DepositTransactionRepository(psqlClient)
    const depositTransactionService = new DepositTransactionService(depositTransactionRepository)
    return depositTransactionService
  }
} 