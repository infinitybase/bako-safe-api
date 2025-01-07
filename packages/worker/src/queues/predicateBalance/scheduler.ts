import { PsqlClient } from "../../utils/psqlClient";
import balanceQueue from "./queue";
import cron from "node-cron";
import { CRON_EXPRESSION, INITIAL_DELAY, QUEUE_BALANCE } from "./constants";

const fn = async () => {
  try {
    const db = await PsqlClient.connect();
    const predicates = await db.query(
      `SELECT predicate_address 
             FROM predicates`
    );

    for (const p of predicates) {
      await balanceQueue.add(
        {
          predicate_address: p.predicate_address,
        },
        {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    console.log(`[${QUEUE_BALANCE}] Scheduler finished.`, balanceQueue.name);
  } catch (error) {
    console.error(`[CRON] ${QUEUE_BALANCE} error on scheduling:`, error);
  }
};

class BalanceCron {
  private static instance: BalanceCron;
  private isRunning: boolean = false;

  private constructor() {}

  public static create(): BalanceCron {
    if (!this.instance) {
      this.instance = new BalanceCron();
    }
    if (!this.instance.isRunning) {
      this.instance.start();
    }
    return this.instance;
  }

  public start(): void {
    console.log(`[CRON] ${QUEUE_BALANCE} Starting balance cron`, {
      CRON_EXPRESSION,
      INITIAL_DELAY,
    });

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

export default BalanceCron;
