import { PredicateCacheRepository } from '../repositories/predicateCacheRepository';
import { PredicateRepository } from '../repositories/predicateRepository'
import { PredicateService } from '../services/predicateService'
import { getMongoClientInstance } from '@/database/mongoInstance';
import { getPsqlClientInstance } from '@/database/psqlInstance';

export class PredicatesFactory {
  constructor() {}

  static async getInstance() {
    const psqlClient = await getPsqlClientInstance();
    const mongoClient = await getMongoClientInstance();

    const predicateRepository = new PredicateRepository(psqlClient)
    const predicateCacheRepository = new PredicateCacheRepository(mongoClient)

    const predicateService = new PredicateService(
      predicateRepository,
      predicateCacheRepository
    )

    return predicateService
  }
}