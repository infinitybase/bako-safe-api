import { PredicateCacheRepository } from '../repositories/predicateCacheRepository';
import { PredicateRepository } from '../repositories/predicateRepository'
import { PredicateService } from '../services/predicateService'

export class PredicatesFactory {
  constructor() {}

  static async getInstance() {
    const predicateRepository = new PredicateRepository()
    await predicateRepository.init();

    const predicateCacheRepository = new PredicateCacheRepository()
    await predicateCacheRepository.init();

    const predicateService = new PredicateService(
      predicateRepository,
      predicateCacheRepository
    )

    return predicateService
  }
} 