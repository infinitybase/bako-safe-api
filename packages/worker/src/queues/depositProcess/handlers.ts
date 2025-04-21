import depositQueue from "./queue";
import redisClient from "@/clients/redisClient";
import { PRIORITY, QUEUE_DEPOSIT } from "./constants";
import { getDynamicTTL } from "./utils/getDynamicTTL";
import { PredicatesFactory } from "./factories/predicatesFactory";
import { PredicateQueue } from "./types";

export async function enqueueDepositWithTTL(predicate: PredicateQueue) {
  const redisKey = `predicate:scheduled:${predicate.predicate_address}`;

  const isActive = Boolean(predicate.token_user_id);

  const exists = await redisClient.exists(redisKey);
  if (exists && !isActive) {
    console.log('\n\n[REDIS EXISTS SCHEDULED]: ', `${predicate.predicate_address}`);
    return false;
  }

  const priority = isActive ? PRIORITY.ACTIVE : PRIORITY.INACTIVE;

  await depositQueue.add(
    { predicate },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      priority,
    }
  );

  const predicateService = await PredicatesFactory.getInstance();

  const lastUpdated = await predicateService.getLastUpdatedPredicate(predicate.predicate_address);
  const ttl = await getDynamicTTL(predicate, lastUpdated);

  await redisClient.set(redisKey, "1", "EX", ttl);

  console.log(`[${QUEUE_DEPOSIT}] Predicate ${predicate.predicate_address} enqueued`);
  return `[${QUEUE_DEPOSIT}] Predicate ${predicate.predicate_address} enqueued`;
}

export async function enqueueImmediateDeposit(predicate: PredicateQueue) {
  await depositQueue.add(
    { predicate },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      priority: PRIORITY.IMMEDIATELY,
    }
  );

  console.log(`[${QUEUE_DEPOSIT}] Immediate deposit for ${predicate.predicate_address} enqueued`);
  return `[${QUEUE_DEPOSIT}] Immediate deposit for ${predicate.predicate_address} enqueued`;
}