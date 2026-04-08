import Queue from 'bull';
import { logger } from '@src/config/logger';

const REDIS_URL_WRITE =
  process.env.REDIS_URL_WRITE || 'redis://127.0.0.1:6379';

const QUEUE_SUBMIT_TRANSACTION = 'QUEUE_SUBMIT_TRANSACTION';
const BACKOFF_STEP_MS = 5000;
const BACKOFF_CYCLE = 5;
const MAX_ATTEMPTS = 120;

type SubmitTransactionJob = {
  hash: string;
  network_url: string;
};

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  const isLocal = parsed.hostname.includes('127.');
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(!isLocal ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

const submitTransactionQueue = new Queue<SubmitTransactionJob>(
  QUEUE_SUBMIT_TRANSACTION,
  {
    redis: parseRedisUrl(REDIS_URL_WRITE),
    settings: {
      backoffStrategies: {
        cyclic: (attemptsMade: number) => {
          const position = ((attemptsMade - 1) % BACKOFF_CYCLE) + 1;
          return position * BACKOFF_STEP_MS;
        },
      },
    },
  },
);

function jobIdForHash(hash: string) {
  return `tx_submit_${hash}`;
}

/**
 * Enqueues a transaction for on-chain submission.
 *
 * Uses a deterministic jobId (tx_submit_{hash}) to prevent duplicates.
 * If a failed job already exists for this hash, it is removed first
 * so the transaction can be re-enqueued with fresh attempts.
 */
export async function enqueueTransactionSubmit(
  hash: string,
  networkUrl: string,
) {
  const jobId = jobIdForHash(hash);

  try {
    // Remove any existing failed job for this hash so it can be re-enqueued
    const existingJob = await submitTransactionQueue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'failed') {
        await existingJob.remove();
        logger.info(
          { hash, jobId, previousState: state },
          '[SUBMIT_TX_QUEUE] Removed previous failed job for re-enqueue',
        );
      } else if (state === 'active' || state === 'waiting' || state === 'delayed') {
        logger.info(
          { hash, jobId, state },
          '[SUBMIT_TX_QUEUE] Job already in queue, skipping duplicate',
        );
        return;
      }
    }

    const job = await submitTransactionQueue.add(
      { hash, network_url: networkUrl },
      {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'cyclic' as any },
        removeOnComplete: true,
        removeOnFail: false,
        jobId,
      },
    );
    logger.info(
      { hash, jobId: job.id, network: networkUrl, maxAttempts: MAX_ATTEMPTS },
      '[SUBMIT_TX_QUEUE] Transaction enqueued for submission',
    );
  } catch (e) {
    logger.error(
      { error: e, hash, network: networkUrl },
      '[SUBMIT_TX_QUEUE] Failed to enqueue transaction',
    );
  }
}
