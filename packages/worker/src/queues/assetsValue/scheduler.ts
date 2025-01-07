import assetQueue from "./queue";
import cron from "node-cron";
import { CRON_EXPRESSION, QUEUE_ASSET } from "./constants";

const fn = async () => {
  try {
    const queue = await assetQueue.add(
      {},
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  } catch (e) {
    console.error(e);
  }
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
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    cron.schedule(CRON_EXPRESSION, () => {
      fn();
    });
  }
}

export default AssetCron;
