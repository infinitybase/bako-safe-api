import transactionQueue from "./queue";
import { QUEUE_TRANSACTION, REPEAT_INTERVAL_MS } from "./constants";
import { logger } from "@/config/logger";

class TransactionCron {
  private static instance: TransactionCron;
  private isRunning: boolean = false;

  private constructor() {}

  public static create(): TransactionCron {
    if (!this.instance) {
      this.instance = new TransactionCron();
    }
    if (!this.instance.isRunning) {
      this.instance.setup();
    }
    return this.instance;
  }

  private async setup(): Promise<void> {
    try {
      this.isRunning = true;

      await transactionQueue.obliterate({ force: true });

      await transactionQueue.add(
        {},
        {
          jobId: `startup-${QUEUE_TRANSACTION}`,
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      await transactionQueue.add(
        {},
        {
          repeat: { every: REPEAT_INTERVAL_MS },
          delay: REPEAT_INTERVAL_MS,
          jobId: "transaction-cron-recurrent",
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      logger.info(
        `[${QUEUE_TRANSACTION}] Setup complete: Immediate job added & Cron scheduled.`
      );
    } catch (e) {
      this.isRunning = false;
      logger.error({ error: e }, `[${QUEUE_TRANSACTION}] Error in setup`);
    }
  }
}

export default TransactionCron;
