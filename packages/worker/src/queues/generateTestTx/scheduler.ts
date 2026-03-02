import transactionQueue from "./queue";
import { QUEUE_TRANSACTION, CRON_EXPRESSION } from "./constants";

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

      await transactionQueue.add(
        {},
        {
          jobId: `startup-${QUEUE_TRANSACTION}`,
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          priority: 1,
        }
      );

      await transactionQueue.add(
        {},
        {
          repeat: { cron: CRON_EXPRESSION },
          jobId: "transaction-cron-recurrent",
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(
        `[${QUEUE_TRANSACTION}] Setup complete: Immediate job added & Cron scheduled.`
      );
    } catch (e) {
      this.isRunning = false;
      console.error(`[${QUEUE_TRANSACTION}] Error in setup:`, e);
    }
  }
}

export default TransactionCron;
