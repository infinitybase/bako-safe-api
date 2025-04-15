import { DepositBlockRepository } from '../repositories/depositBlockRepository'
import { DepositBlockService } from '../services/depositBlockService'
import { getMongoClientInstance } from '@/database/mongoInstance';

export class DepositBlockFactory {
  constructor() {}

  static async getInstance() {
    const MongoClient = await getMongoClientInstance();

    const depositBlockRepository = new DepositBlockRepository(MongoClient)
    const depositBlockService = new DepositBlockService(depositBlockRepository)
    return depositBlockService
  }
} 