import { PredicateCacheRepository } from '../repositories/predicateCacheRepository';
import { PredicateRepository } from '../repositories/predicateRepository'
import { PredicateService } from '../services/predicateService'
import { PsqlClient, MongoDatabase } from "@/clients";

export class PredicatesFactory {
  constructor() {}

  static async getInstance(psqlClient: PsqlClient, mongoClient: MongoDatabase) {
    const predicateRepository = new PredicateRepository(psqlClient)
    const predicateCacheRepository = new PredicateCacheRepository(mongoClient)

    const predicateService = new PredicateService(
      predicateRepository,
      predicateCacheRepository
    )

    return predicateService
  }
} 