import assetQueue from "./queue";
import cron from "node-cron";
import { CRON_EXPRESSION, QUEUE_ASSET } from "./constants";

const fn = async () => {
  console.log(`[${QUEUE_ASSET}] Scheduler running.`);
  await assetQueue.add(
    {},
    {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

class AssetCron {
  private static instance: AssetCron;
  private isRunning: boolean = false;

  private constructor() {}

  public static create(): AssetCron {
    if (!this.instance) {
      this.instance = new AssetCron();
    }
    if (!this.instance.isRunning) {
      this.instance.start();
    }
    return this.instance;
  }

  public start(): void {
    console.log(`[CRON] ${QUEUE_ASSET} Starting asset cron`, {
      CRON_EXPRESSION,
      INITIAL_DELAY: 0, //
    });

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    fn(); // 1st run

    cron.schedule(CRON_EXPRESSION, () => {
      fn();
    });
  }
}

export default AssetCron;
