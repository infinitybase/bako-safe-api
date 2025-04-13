import { PredicateDepositData } from "../types";
import { IPredicateService } from "./IPredicateService";
import { PredicateRepository } from "../repositories/predicateRepository";
import { PredicateCacheRepository } from "../repositories/predicateCacheRepository";
import redisClient from "@/clients/redisClient";

export class PredicateService implements IPredicateService<PredicateDepositData> {
  constructor(
    private readonly predicateRepository: PredicateRepository,
    private readonly predicateCacheRepository: PredicateCacheRepository
  ) {}

  async listPredicates() {
    return this.predicateRepository.listPredicates();
  }

  async getLastUpdatedPredicate(predicateAddress: string) {
    const lastUpdateRedisKey = `predicate:last:update:${predicateAddress}`;
    const lastUpdated = await redisClient.get(lastUpdateRedisKey);

    if (!lastUpdated) {
      return this.predicateCacheRepository.getLastUpdatePredicate(predicateAddress);
    }

    return new Date(lastUpdated) ?? null;
  }

  async setLastUpdatedPredicate(predicateAddress: string, date: Date) {
    const lastUpdateRedisKey = `predicate:last:update:${predicateAddress}`;
    await redisClient.set(lastUpdateRedisKey, JSON.stringify({ date: new Date() }));

    await this.predicateCacheRepository.setLastUpdatePredicate(predicateAddress, date);
  }
}
