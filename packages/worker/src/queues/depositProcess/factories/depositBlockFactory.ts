import { DepositBlockRepository } from '../repositories/depositBlockRepository'
import { DepositBlockService } from '../services/depositBlockService'
import { MongoDatabase } from '@/clients'

export class DepositBlockFactory {
  constructor() {}

  static async getInstance(mongoClient: MongoDatabase) {
    const depositBlockRepository = new DepositBlockRepository(mongoClient)
    const depositBlockService = new DepositBlockService(depositBlockRepository)
    return depositBlockService
  }
} 