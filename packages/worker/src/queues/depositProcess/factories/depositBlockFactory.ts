import { DepositBlockRepository } from '../repositories/depositBlockRepository'
import { DepositBlockService } from '../services/depositBlockService'

export class DepositBlockFactory {
  constructor() {}

  static async getInstance() {
    const depositBlockRepository = new DepositBlockRepository()
    await depositBlockRepository.init();
    const depositBlockService = new DepositBlockService(depositBlockRepository)
    return depositBlockService
  }
} 