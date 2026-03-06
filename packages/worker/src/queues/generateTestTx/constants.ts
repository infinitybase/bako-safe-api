export const QUEUE_TRANSACTION = "QUEUE_TRANSACTION";

// Interval can be configured per environment using an environment variable.
// Default: 20 minutes.
export const REPEAT_INTERVAL_MS =
  Number(process.env.TRANSACTION_CRON_INTERVAL_MS) || 20 * 60 * 1000;
