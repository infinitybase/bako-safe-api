import depositQueue from "./queue";
import cron from "node-cron";
import {
  CRON_EXPRESSION,
  INITIAL_DELAY,
  PRIORITY,
  QUEUE_DEPOSIT,
} from "./constants";
import { PredicatesFactory } from "./factories/predicatesFactory";
import redisClient from "@/clients/redisClient";
import { getDynamicTTL } from "./utils/getDynamicTTL";

const fn = async () => {
  try {
    const predicateService = await PredicatesFactory.getInstance();

    const predicates = await predicateService.listPredicates();

    for (const p of predicates) {
      const isActive = Boolean(p.token_user_id);
      const priority =isActive ? PRIORITY.ACTIVE : PRIORITY.INACTIVE;

      const redisKey = `predicate:scheduled:${p.predicate_address}`;

      const exists = await redisClient.exists(redisKey);
      if (exists) {
        continue;
      }

      const data = {
        predicate_id: p.id,
        predicate_address: p.predicate_address,
      }

      await depositQueue.add(data,
        {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: false,
          priority
        }
      );

      const predicateService = await PredicatesFactory.getInstance();
      const lastUpdated = await predicateService.getLastUpdatedPredicate(p.predicate_address);

      const ttl = await getDynamicTTL(p, lastUpdated);
      await redisClient.set(redisKey, "1", "EX", ttl);

    }
  } catch (error) {
    console.error(`[${QUEUE_DEPOSIT}] error on scheduling:`, error);
  }
};

class DepositCron {
  private static instance: DepositCron;
  private isRunning: boolean = false;

  private constructor() {}

  public static create(): DepositCron {
    if (!this.instance) {
      this.instance = new DepositCron();
    }
    if (!this.instance.isRunning) {
      this.instance.start();
    }
    return this.instance;
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    setTimeout(() => {
      fn();
    }, Number(INITIAL_DELAY) ?? 0);

    cron.schedule(CRON_EXPRESSION, fn);
  }
}

export default DepositCron;
