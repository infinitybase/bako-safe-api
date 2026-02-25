import cron from "node-cron";
import userBlockSyncQueue from "./queue";
import {
  CRON_EXPRESSION_USER_SYNC,
  INITIAL_DELAY_USER_SYNC,
  QUEUE_USER_BLOCK_SYNC,
} from "./constants";
import { getLoggedUsersSortedByLogin } from "./utils";

/**
 * Schedule jobs for all logged-in users
 * Users are processed in order of most recent login (priority)
 */
const scheduleUserSync = async () => {
  try {
    const loggedUsers = await getLoggedUsersSortedByLogin();

    if (loggedUsers.length === 0) {
      return;
    }

    console.log(
      `[${QUEUE_USER_BLOCK_SYNC}] Scheduling sync for ${loggedUsers.length} logged users`
    );

    // Add jobs for each user with priority based on login order
    for (let i = 0; i < loggedUsers.length; i++) {
      const user = loggedUsers[i];

      await userBlockSyncQueue.add(
        {
          user_id: user.user_id,
          user_address: user.user_address,
          predicates: user.predicates,
          last_login: user.last_login,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
          // Lower priority number = higher priority
          // Most recent login gets priority 1, next gets 2, etc.
          priority: i + 1,
          // Prevent duplicate jobs for same user
          jobId: `user_sync_${user.user_id}_${Date.now()}`,
        }
      );
    }
  } catch (error) {
    console.error(`[${QUEUE_USER_BLOCK_SYNC}] Error scheduling user sync:`, error);
  }
};

class UserBlockSyncCron {
  private static instance: UserBlockSyncCron;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  public static create(): UserBlockSyncCron {
    if (!this.instance) {
      this.instance = new UserBlockSyncCron();
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

    console.log(
      `[${QUEUE_USER_BLOCK_SYNC}] Starting scheduler with cron: ${CRON_EXPRESSION_USER_SYNC}`
    );

    // Initial delay before first run
    setTimeout(() => {
      scheduleUserSync();
    }, INITIAL_DELAY_USER_SYNC);

    // Schedule recurring job every 10 seconds
    this.cronJob = cron.schedule(CRON_EXPRESSION_USER_SYNC, scheduleUserSync);
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log(`[${QUEUE_USER_BLOCK_SYNC}] Scheduler stopped`);
    }
  }
}

export default UserBlockSyncCron;
