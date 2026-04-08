import Queue from "bull";
import { redisConfig, PsqlClient } from "@/clients";
import { Vault, TransactionStatus } from "bakosafe";
import { Provider, transactionRequestify } from "fuels";
import { hexlify } from "fuels";
import { io } from "socket.io-client";
import {
  QUEUE_SUBMIT_TRANSACTION,
  BACKOFF_STEP_MS,
  BACKOFF_CYCLE,
} from "./constants";
import type { QueueSubmitTransaction, RetryAttemptEntry } from "./types";
import { isTransientError } from "./utils";

const submitTransactionQueue = new Queue<QueueSubmitTransaction>(
  QUEUE_SUBMIT_TRANSACTION,
  {
    redis: redisConfig,
    settings: {
      backoffStrategies: {
        cyclic: (attemptsMade: number) => {
          // Progressao de +5s, reseta a cada 5 tentativas
          // 5s, 10s, 15s, 20s, 25s, 5s, 10s, 15s, 20s, 25s, ...
          const position = ((attemptsMade - 1) % BACKOFF_CYCLE) + 1;
          return position * BACKOFF_STEP_MS;
        },
      },
    },
  }
);

/**
 * Extrai witnesses de uma transacao, replicando a logica de Transaction.getWitnesses()
 * da API (models/Transaction.ts:185-211).
 */
function extractWitnesses(
  resume: any,
  txData: any
): string[] {
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
 * Appends an attempt to the retry_attempts array, grouping consecutive
 * entries with the same error. If the last entry has the same error,
 * it increments count and updates last_* fields instead of creating a new entry.
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
    // Same error as last entry — merge
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

  // Different error — new entry
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
 * Notifica membros do vault via socket apos mudanca de status da tx.
 * Replica o pattern de emitTransaction() da API (socket/events.ts:34-37).
 */
async function emitTransactionUpdate(
  predicateId: string,
  psql: any
): Promise<void> {
  try {
    const members = await psql.query(
      `SELECT user_id as id FROM predicate_members WHERE predicate_id = $1`,
      [predicateId]
    );
    const memberList = Array.isArray(members)
      ? members
      : members
        ? [members]
        : [];

    if (memberList.length === 0) return;

    const isDev = process.env.NODE_ENV === "development";
    const SOCKET_URL = isDev
      ? process.env.SOCKET_URL
      : process.env.WORKER_API_URL;

    if (!SOCKET_URL) {
      console.warn(
        `[${QUEUE_SUBMIT_TRANSACTION}] No SOCKET_URL configured, skipping notification`
      );
      return;
    }

    for (const member of memberList) {
      const socket = io(SOCKET_URL, {
        autoConnect: true,
        auth: {
          username: "[API]",
          data: new Date(),
          sessionId: member.id,
          origin: SOCKET_URL,
        },
      });

      socket.on("connect", () => {
        socket.emit("[TRANSACTION]", {
          sessionId: member.id,
          to: "[UI]",
          type: "[UPDATED]",
        });
        setTimeout(() => socket.disconnect(), 5000);
      });

      socket.on("connect_error", () => {
        socket.disconnect();
      });
    }
  } catch (e) {
    console.error(
      `[${QUEUE_SUBMIT_TRANSACTION}] Failed to emit socket:`,
      e
    );
  }
}

submitTransactionQueue.process(async (job) => {
  const { hash, network_url } = job.data;
  const startTime = Date.now();
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = (job.opts.attempts as number) || 120;
  const isFirstAttempt = attemptNumber === 1;

  console.log(
    JSON.stringify({
      event: isFirstAttempt ? "tx_submit_start" : "tx_submit_retry",
      queue: QUEUE_SUBMIT_TRANSACTION,
      hash,
      attempt: attemptNumber,
      maxAttempts,
      network: network_url,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    })
  );

  const psql = await PsqlClient.connect();

  // 1. Buscar tx no Postgres
  const transaction = await psql.query(
    `SELECT id, hash, tx_data as "txData", status, resume, network, predicate_id as "predicateId"
     FROM transactions
     WHERE hash = $1
       AND status NOT IN ('declined', 'failed', 'canceled')
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [hash]
  );

  if (!transaction) {
    console.log(
      `[${QUEUE_SUBMIT_TRANSACTION}] Transaction ${hash} not found or not eligible`
    );
    return { hash, status: "skipped" };
  }

  if (transaction.status !== TransactionStatus.PENDING_SENDER) {
    console.log(
      `[${QUEUE_SUBMIT_TRANSACTION}] Transaction ${hash} status is ${transaction.status}, skipping`
    );
    return { hash, status: "skipped" };
  }

  // 2. Buscar predicate
  const predicate = await psql.query(
    `SELECT configurable, version, predicate_address as "predicateAddress"
     FROM predicates
     WHERE id = $1`,
    [transaction.predicateId]
  );

  if (!predicate) {
    console.error(
      `[${QUEUE_SUBMIT_TRANSACTION}] Predicate not found for tx ${hash}`
    );
    return { hash, status: "error", reason: "predicate_not_found" };
  }

  // 3. Montar Vault e tx
  // IMPORTANTE: usar Provider do fuels, NUNCA BakoProvider.
  // Vault.send() verifica `provider instanceof BakoProvider`:
  //   - BakoProvider → chama POST /transaction/send/:hash → enfileira de novo → LOOP INFINITO
  //   - Provider normal → provider.operations.submit() → direto na blockchain
  const providerUrl = network_url.replace(/^https?:\/\/[^@]+@/, "https://");
  const provider = new Provider(providerUrl);
  const vault = new Vault(
    provider,
    JSON.parse(predicate.configurable),
    predicate.version
  );

  // 4. Extrair witnesses
  const { resume, txData } = transaction;
  const witnesses = extractWitnesses(resume, txData);

  const tx = transactionRequestify({
    ...txData,
    witnesses,
  });

  // 5. Enviar on-chain
  try {
    const transactionResponse = await vault.send(tx);
    const { gasUsed } = await transactionResponse.waitForResult();
    const durationMs = Date.now() - startTime;

    // 6. Sucesso: atualizar DB
    const updatedResume = {
      ...resume,
      gasUsed: gasUsed.format(),
      status: "success",
    };

    const existing = await psql.query(
      `SELECT retry_attempts FROM transactions WHERE id = $1`,
      [transaction.id]
    );
    const retryAttempts = appendAttempt(
      existing?.retry_attempts || [],
      attemptNumber,
      null,
      durationMs
    );

    await psql.query(
      `UPDATE transactions
       SET status = 'success',
           "sendTime" = NOW(),
           "gasUsed" = $1,
           resume = $2,
           retry_attempts = $3
       WHERE id = $4`,
      [
        gasUsed.format(),
        JSON.stringify(updatedResume),
        JSON.stringify(retryAttempts),
        transaction.id,
      ]
    );

    // 7. Notificar membros via socket
    await emitTransactionUpdate(transaction.predicateId, psql);

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

    const existing = await psql.query(
      `SELECT retry_attempts FROM transactions WHERE id = $1`,
      [transaction.id]
    );
    const retryAttempts = appendAttempt(
      existing?.retry_attempts || [],
      attemptNumber,
      errorStr,
      durationMs
    );

    if (retriable && !isLastAttempt) {
      // Erro transiente, ainda tem tentativas: manter PENDING_SENDER
      await psql.query(
        `UPDATE transactions
         SET resume = $1,
             retry_attempts = $2
         WHERE id = $3`,
        [
          JSON.stringify({
            ...resume,
            error: errorObj,
            retry: { count: attemptNumber },
          }),
          JSON.stringify(retryAttempts),
          transaction.id,
        ]
      );

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

    // Erro permanente ou ultima tentativa: marcar FAILED
    const updatedResume = {
      ...resume,
      gasUsed: "0.0",
      status: "failed",
      error: errorObj,
    };

    await psql.query(
      `UPDATE transactions
       SET status = 'failed',
           "sendTime" = NOW(),
           "gasUsed" = '0.0',
           resume = $1,
           retry_attempts = $2
       WHERE id = $3`,
      [
        JSON.stringify(updatedResume),
        JSON.stringify(retryAttempts),
        transaction.id,
      ]
    );

    // Notificar falha via socket
    await emitTransactionUpdate(transaction.predicateId, psql);

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
        totalElapsed_ms: Date.now() - startTime,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      })
    );
    return { hash, status: "failed" };
  }
});

// Event handlers
submitTransactionQueue.on("completed", (job, result) => {
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

submitTransactionQueue.on("failed", (job, err) => {
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

export default submitTransactionQueue;
