import Queue from "bull";
import { redisConfig } from "@/clients";
import { Vault, TransactionStatus } from "bakosafe";
import { Provider, transactionRequestify } from "fuels";
import { hexlify } from "fuels";
import {
  QUEUE_SUBMIT_TRANSACTION,
  BACKOFF_STEP_MS,
  BACKOFF_CYCLE,
} from "./constants";
import type { QueueSubmitTransaction, RetryAttemptEntry } from "./types";
import { isTransientError } from "./utils";

const { WORKER_REDIS_HOST_PROD } = process.env;

const queueSettings = {
  backoffStrategies: {
    cyclic: (attemptsMade: number) => {
      const position = ((attemptsMade - 1) % BACKOFF_CYCLE) + 1;
      return position * BACKOFF_STEP_MS;
    },
  },
};

// Primary queue — consumes from the default Redis (hmg/staging)
const submitTransactionQueue = new Queue<QueueSubmitTransaction>(
  QUEUE_SUBMIT_TRANSACTION,
  { redis: redisConfig, settings: queueSettings }
);

// Secondary queue — consumes from prod Redis (if configured)
const isLocal = WORKER_REDIS_HOST_PROD?.includes("127.") ?? false;
const submitTransactionQueueProd = WORKER_REDIS_HOST_PROD
  ? new Queue<QueueSubmitTransaction>(QUEUE_SUBMIT_TRANSACTION, {
      redis: {
        host: WORKER_REDIS_HOST_PROD,
        port: 6379,
        ...(!isLocal ? { tls: { rejectUnauthorized: false } } : {}),
      },
      settings: queueSettings,
    })
  : null;

/**
 * Extracts witnesses from resume and txData, replicating
 * Transaction.getWitnesses() from the API (models/Transaction.ts:192-214).
 */
function extractWitnesses(resume: any, txData: any): string[] {
  const witnesses = (resume.witnesses || [])
    .filter((w: any) => !!w.signature)
    .map((w: any) => w.signature);

  const txWitnesses = txData.witnesses || [];

  if ("bytecodeWitnessIndex" in txData) {
    const { bytecodeWitnessIndex } = txData;
    const bytecode = txWitnesses[bytecodeWitnessIndex];
    if (bytecode) {
      witnesses.splice(bytecodeWitnessIndex, 0, hexlify(bytecode));
    }
  }

  if ("witnessIndex" in txData) {
    const { witnessIndex } = txData;
    const bytecode = txWitnesses[witnessIndex];
    if (bytecode) {
      witnesses.splice(witnessIndex, 0, hexlify(bytecode));
    }
  }

  return witnesses;
}

/**
 * Groups consecutive retry attempts with the same error into a single entry.
 */
function appendAttempt(
  attempts: RetryAttemptEntry[],
  attemptNumber: number,
  error: string | null,
  durationMs: number
): RetryAttemptEntry[] {
  const now = new Date().toISOString();
  const last = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  if (last && last.error === error) {
    const updated = [...attempts];
    const prev = updated[updated.length - 1];
    const totalDuration = prev.avg_duration_ms * prev.count + durationMs;
    const newCount = prev.count + 1;
    updated[updated.length - 1] = {
      ...prev,
      last_attempt: attemptNumber,
      last_timestamp: now,
      count: newCount,
      avg_duration_ms: Math.round(totalDuration / newCount),
    };
    return updated;
  }

  return [
    ...attempts,
    {
      error,
      first_attempt: attemptNumber,
      last_attempt: attemptNumber,
      count: 1,
      first_timestamp: now,
      last_timestamp: now,
      avg_duration_ms: durationMs,
    },
  ];
}

/**
 * Calls the API's /notify-result endpoint to update DB, invalidate cache,
 * emit socket with full data, and send notifications.
 */
async function notifyTransactionResult(
  apiUrl: string,
  transactionId: string,
  body: {
    status: string;
    gasUsed?: string;
    errorData?: any;
    retryAttempts?: RetryAttemptEntry[];
  }
): Promise<void> {
  const baseUrl = apiUrl.replace(/\/+$/, "");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const workerSecret = process.env.WORKER_SHARED_SECRET;
    if (workerSecret) {
      headers["x-worker-secret"] = workerSecret;
    }

    const response = await fetch(
      `${baseUrl}/transaction/notify-result/${transactionId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: "tx_notify_result_failed",
          queue: QUEUE_SUBMIT_TRANSACTION,
          transactionId,
          apiUrl: baseUrl,
          status: response.status,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "tx_notify_result_error",
        queue: QUEUE_SUBMIT_TRANSACTION,
        transactionId,
        apiUrl: baseUrl,
        error: (e as Error).message,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// Track retry attempts in memory per job (not persisted — sent to API on completion)
const jobAttempts = new Map<string, RetryAttemptEntry[]>();

async function processSubmitTransaction(job: Queue.Job<QueueSubmitTransaction>) {
  const {
    hash,
    transactionId,
    apiUrl,
    networkUrl,
    txData,
    resume,
    predicateConfigurable,
    predicateVersion,
  } = job.data;

  const startTime = Date.now();
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = (job.opts.attempts as number) || 120;
  const isFirstAttempt = attemptNumber === 1;
  const jobKey = job.id?.toString() || hash;

  console.log(
    JSON.stringify({
      event: isFirstAttempt ? "tx_submit_start" : "tx_submit_retry",
      queue: QUEUE_SUBMIT_TRANSACTION,
      hash,
      attempt: attemptNumber,
      maxAttempts,
      apiUrl,
      network: networkUrl,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    })
  );

  // Build Vault and transaction from job data — no DB access needed
  // IMPORTANT: use Provider from fuels, NEVER BakoProvider.
  // Vault.send() checks `provider instanceof BakoProvider`:
  //   - BakoProvider → calls POST /transaction/send/:hash → enqueues again → INFINITE LOOP
  //   - Regular Provider → provider.operations.submit() → direct to blockchain
  const providerUrl = networkUrl.replace(/^https?:\/\/[^@]+@/, "https://");
  const provider = new Provider(providerUrl);
  // Ensure provider has fetched chain info and consensus parameters
  // before using it. Without this, estimatePredicates may fail with OutOfGas.
  await provider.getChain();
  const vault = new Vault(
    provider,
    JSON.parse(predicateConfigurable),
    predicateVersion
  );

  const witnesses = extractWitnesses(resume, txData);
  const tx = transactionRequestify({ ...txData, witnesses });

  // Get accumulated attempts for this job
  const previousAttempts = jobAttempts.get(jobKey) || [];

  try {
    const transactionResponse = await vault.send(tx);
    const { gasUsed } = await transactionResponse.waitForResult();
    const durationMs = Date.now() - startTime;

    const retryAttempts = appendAttempt(previousAttempts, attemptNumber, null, durationMs);
    jobAttempts.delete(jobKey);

    // Notify API — it handles DB update, cache, socket, notification
    await notifyTransactionResult(apiUrl, transactionId, {
      status: "success",
      gasUsed: gasUsed.format(),
      retryAttempts,
    });

    console.log(
      JSON.stringify({
        event: "tx_submit_success",
        queue: QUEUE_SUBMIT_TRANSACTION,
        hash,
        attempt: attemptNumber,
        maxAttempts,
        gasUsed: gasUsed.format(),
        duration_ms: durationMs,
        retriesNeeded: attemptNumber - 1,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      })
    );
    return { hash, status: "success", gasUsed: gasUsed.format() };
  } catch (e) {
    const durationMs = Date.now() - startTime;
    const errorObj = "toObject" in (e as any) ? (e as any).toObject() : e;
    const errorStr =
      typeof errorObj === "string" ? errorObj : JSON.stringify(errorObj);
    const retriable = isTransientError(e);
    const isLastAttempt = attemptNumber >= maxAttempts;

    const retryAttempts = appendAttempt(previousAttempts, attemptNumber, errorStr, durationMs);

    if (retriable && !isLastAttempt) {
      // Store attempts in memory for next retry
      jobAttempts.set(jobKey, retryAttempts);

      const cyclePosition = ((attemptNumber - 1) % BACKOFF_CYCLE) + 1;
      const nextDelay = cyclePosition * BACKOFF_STEP_MS;

      console.warn(
        JSON.stringify({
          event: "tx_submit_transient_error",
          queue: QUEUE_SUBMIT_TRANSACTION,
          hash,
          attempt: attemptNumber,
          maxAttempts,
          attemptsRemaining: maxAttempts - attemptNumber,
          error: errorStr,
          retriable: true,
          duration_ms: durationMs,
          next_retry_ms: nextDelay,
          jobId: job.id,
          timestamp: new Date().toISOString(),
        })
      );
      throw e; // Re-throw → Bull retries with cyclic backoff
    }

    jobAttempts.delete(jobKey);

    // Permanent failure — notify API
    await notifyTransactionResult(apiUrl, transactionId, {
      status: "failed",
      gasUsed: "0.0",
      errorData: errorObj,
      retryAttempts,
    });

    console.error(
      JSON.stringify({
        event: "tx_submit_permanent_failure",
        queue: QUEUE_SUBMIT_TRANSACTION,
        hash,
        attempt: attemptNumber,
        maxAttempts,
        error: errorStr,
        retriable: false,
        isLastAttempt,
        duration_ms: durationMs,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      })
    );
    return { hash, status: "failed" };
  }
}

function registerEventHandlers(queue: Queue.Queue<QueueSubmitTransaction>) {
  queue.on("completed", (job, result) => {
    console.log(
      JSON.stringify({
        event: "tx_submit_job_completed",
        queue: QUEUE_SUBMIT_TRANSACTION,
        hash: result.hash,
        result: result.status,
        jobId: job.id,
        totalAttempts: job.attemptsMade + 1,
        timestamp: new Date().toISOString(),
      })
    );
  });

  queue.on("failed", (job, err) => {
    console.error(
      JSON.stringify({
        event: "tx_submit_job_failed",
        queue: QUEUE_SUBMIT_TRANSACTION,
        hash: job.data.hash,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: err.message,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      })
    );
  });
}

// Register processor and event handlers on both queues
submitTransactionQueue.process(processSubmitTransaction);
registerEventHandlers(submitTransactionQueue);

if (submitTransactionQueueProd) {
  submitTransactionQueueProd.process(processSubmitTransaction);
  registerEventHandlers(submitTransactionQueueProd);
  console.log(`[${QUEUE_SUBMIT_TRANSACTION}] Prod Redis queue registered`);
}

export { submitTransactionQueueProd };
export default submitTransactionQueue;
