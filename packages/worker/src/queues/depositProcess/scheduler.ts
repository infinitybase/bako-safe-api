import cron from "node-cron";
import {
  CRON_EXPRESSION,
  INITIAL_DELAY,
  QUEUE_DEPOSIT,
} from "./constants";
import { PredicatesFactory } from "./factories/predicatesFactory";
import { enqueueDepositWithTTL } from "./handlers";

const fn = async () => {
  try {
    const predicateService = await PredicatesFactory.getInstance();

    const predicates = await predicateService.listPredicates();

    for (const predicate of predicates) {
      await enqueueDepositWithTTL(predicate);
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
