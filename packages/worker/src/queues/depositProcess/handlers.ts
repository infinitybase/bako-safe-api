
import depositQueue from "./queue";
import redisClient from "@/clients/redisClient";
import { PRIORITY, QUEUE_DEPOSIT } from "./constants";
import { getDynamicTTL } from "./utils/getDynamicTTL";
import { PredicatesFactory } from "./factories/predicatesFactory";

export async function enqueueDepositWithTTL(predicate: {
  id: string;
  predicate_address: string;
  token_user_id?: string | null;
}) {
  const redisKey = `predicate:scheduled:${predicate.predicate_address}`;

  const exists = await redisClient.exists(redisKey);
  if (exists) {
    console.log('\n\n[REDIS EXISTS SCHEDULED]: ', `${predicate.predicate_address}`);
    return false;
  }

  const isActive = Boolean(predicate.token_user_id);
  const priority = isActive ? PRIORITY.ACTIVE : PRIORITY.INACTIVE;

  const data = {
    predicate_id: predicate.id,
    predicate_address: predicate.predicate_address,
  };

  await depositQueue.add(data, {
    attempts: 3,
    backoff: 5000,
    removeOnComplete: true,
    removeOnFail: false,
    priority,
  });

  const predicateService = await PredicatesFactory.getInstance();

  const lastUpdated = await predicateService.getLastUpdatedPredicate(predicate.predicate_address);
  const ttl = await getDynamicTTL(predicate, lastUpdated);

  await redisClient.set(redisKey, "1", "EX", ttl);

  console.log(`[${QUEUE_DEPOSIT}] Predicate ${predicate.predicate_address} enqueued`);
  return `[${QUEUE_DEPOSIT}] Predicate ${predicate.predicate_address} enqueued`;
}

export async function enqueueImmediateDeposit(predicate_id: string, predicate_address: string) {
  await depositQueue.add(
    { predicate_id, predicate_address },
    {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false,
      priority: PRIORITY.IMMEDIATELY,
    }
  );

  console.log(`[${QUEUE_DEPOSIT}] Immediate deposit for ${predicate_address} enqueued`);
  return `[${QUEUE_DEPOSIT}] Immediate deposit for ${predicate_address} enqueued`;
}