# RFC: Bull Queue for Transaction Submission

**Date:** 2026-04-08
**Status:** Implementation
**Author:** Guilherme Roque

---

## Problem

`sendToChain()` lives in the API and is called synchronously, blocking the HTTP response. If `vault.send()` fails (network timeout, provider unavailable, gas estimation error), the transaction is permanently marked as `FAILED` with no retry. Additionally, it blocks the HTTP response indefinitely while waiting for on-chain confirmation.

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Frontend    │         │  API (stg)   │         │  API (prod)  │
│  (UI/SDK)    │         │              │         │              │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ PUT /sign/:hash        │                        │
       │ POST /send/:hash       │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │    HTTP 200 (immediate)│                        │
       │<───────────────────────│                        │
       │                        │                        │
       │                ┌───────┴────────┐       ┌───────┴────────┐
       │                │ Redis (hmg)    │       │ Redis (prod)   │
       │                │ LPUSH job      │       │ LPUSH job      │
       │                └───────┬────────┘       └───────┬────────┘
       │                        │                        │
       │                        └───────────┬────────────┘
       │                                    │
       │                           ┌────────┴────────┐
       │                           │     Worker      │
       │                           │  (single inst)  │
       │                           │                 │
       │                           │ consumes both   │
       │                           │ Redis queues    │
       │                           └────────┬────────┘
       │                                    │
       │                                    │ vault.send(tx)
       │                                    │ (direct to blockchain)
       │                                    │
       │                           ┌────────┴────────┐
       │                           │  Fuel Blockchain │
       │                           └────────┬────────┘
       │                                    │
       │                                    │ result (success/failed)
       │                                    │
       │                           ┌────────┴────────┐
       │                           │     Worker      │
       │                           │                 │
       │                           │ POST /notify-   │
       │                           │ result/:id      │
       │                           │ (uses apiUrl    │
       │                           │  from job)      │
       │                           └───────┬─────────┘
       │                                   │
       │                    ┌──────────────┴──────────────┐
       │                    │ API (correct environment)    │
       │                    │                              │
       │                    │ • Update DB (status, gas)    │
       │                    │ • Send email notification    │
       │                    │ • Invalidate Redis cache     │
       │                    │ • Emit socket with full tx   │
       │                    └──────────────┬───────────────┘
       │                                   │
       │          socket [TRANSACTION]     │
       │<──────────────────────────────────┘
       │
       │ handleAsyncResult:
       │ toast.success() or toast.error()
```

---

## Step-by-step Flow

### 1. User signs the last required signature (Frontend)

```
useSendTransaction → executeTransaction()
  → toast.loading("Sending your transaction")
  → setIsCurrentTxPending({ isPending: true, transactionId: tx.id })
  → vault.send(tx)
    → BakoProvider.send(hash)
      → POST /transaction/send/:hash
```

### 2. API receives and enqueues (API — staging or prod)

The API serializes all transaction data into a "fat job" payload. The worker needs nothing else — no DB access required.

```
controller.signByID() or controller.send():
  → enqueueTransactionSubmit({
      hash,
      transactionId,
      apiUrl: process.env.API_URL,     ← "https://stg-api.bako.global" or "https://api.bako.global"
      networkUrl,                       ← Fuel provider URL
      txData,                           ← full TransactionRequest (JSONB)
      resume,                           ← witnesses, signatures, requiredSigners
      predicateConfigurable,            ← vault config (JSON string)
      predicateVersion,                 ← predicate version
    })
  → Bull LPUSH to Redis of the current environment
  → HTTP 200 returns immediately
```

### 3. Frontend receives HTTP 200

```
BakoProvider.send() returns
getByHash(hash) → status = PENDING_SENDER (worker hasn't processed yet)
validateResult(PENDING_SENDER) → no action (loading toast already active)

handleAsyncResult is listening for socket events...
```

### 4. Worker picks the job from Redis

The worker is stateless for transaction submission — all data comes from the job payload.

```
Worker consumes from Redis hmg (staging) AND/OR Redis prod
  → job.data has everything needed
  → new Provider(networkUrl)           ← regular Provider, NEVER BakoProvider
  → new Vault(provider, predicateConfigurable, predicateVersion)
  → extractWitnesses(resume, txData)
  → transactionRequestify({...txData, witnesses})
  → vault.send(tx)                    ← direct to Fuel blockchain
  → waitForResult()                   ← waits for on-chain confirmation
```

> **CRITICAL:** The worker uses `Provider` from fuels, never `BakoProvider`.
> `Vault.send()` checks `provider instanceof BakoProvider` internally:
> - BakoProvider → calls `POST /transaction/send/:hash` → enqueues again → **infinite loop**
> - Regular Provider → `provider.operations.submit()` → direct to blockchain

### 5a. Success

```
Worker:
  → POST {apiUrl}/transaction/notify-result/{transactionId}
    headers: { x-worker-secret: WORKER_SHARED_SECRET }
    body: { status: "success", gasUsed: "0.001", retryAttempts: [...] }

API /notify-result:
  → Update transaction in DB (status=SUCCESS, gasUsed, sendTime, retryAttempts)
  → NotificationService.transactionSuccess() — email + in-app notification
  → invalidateCaches() — Redis balance + tx cache
  → emitTransaction() — socket [TRANSACTION] with full formatted tx data

Frontend:
  → useTransactionsSocketListener receives socket
    → updateTransactions: replaces tx in React Query cache (full data)
    → updateHistory: updates transaction history
    → handleSignaturePending: invalidates pending queries
  → useSendTransaction.handleAsyncResult:
    → detects: isCurrentTxPending + matching transactionId + status SUCCESS + has name
    → toast.success(tx) — closes loading toast, shows success with "View on explorer"
    → setIsCurrentTxPending(false)
```

### 5b. Transient error (e.g., network timeout)

```
Worker:
  → vault.send() throws error
  → isTransientError("ETIMEDOUT") → true
  → isLastAttempt? no (attempt 1/120)
  → stores retry attempt in memory
  → throw error → Bull retries with cyclic backoff (5s, 10s, 15s, 20s, 25s, 5s...)

Frontend: nothing happens, loading toast continues
```

### 5c. Permanent error or attempts exhausted

```
Worker:
  → POST {apiUrl}/transaction/notify-result/{transactionId}
    body: { status: "failed", gasUsed: "0.0", errorData: {...}, retryAttempts: [...] }

API /notify-result:
  → Update transaction in DB (status=FAILED)
  → invalidateCaches()
  → emitTransaction() — socket with full tx data

Frontend handleAsyncResult:
  → detects status FAILED
  → toast.error("Transaction failed")
  → setIsCurrentTxPending(false)
```

---

## Dual Redis — Single Worker for Multiple Environments

A single worker instance consumes from both staging and production Redis queues. Each job carries `apiUrl` identifying which API to call back.

```
┌─────────────────┐     ┌─────────────────┐
│  API Staging     │     │  API Production  │
│                  │     │                  │
│  enqueue job     │     │  enqueue job     │
│  apiUrl=stg-api  │     │  apiUrl=api      │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│  Redis hmg      │     │  Redis prod     │
│  (WORKER_REDIS  │     │  (WORKER_REDIS  │
│   _HOST)        │     │   _HOST_PROD)   │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └───────────┬────────────┘
                     │
            ┌────────┴────────┐
            │     Worker      │
            │                 │
            │  Queue 1: hmg   │
            │  Queue 2: prod  │
            │  Same processor │
            └────────┬────────┘
                     │
                     │ On completion:
                     │ POST {job.apiUrl}/transaction/notify-result/:id
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  stg-api.bako.global    api.bako.global
  (updates stg DB)       (updates prod DB)
```

### Configuration

| Environment Variable | Where | Value |
|---------------------|-------|-------|
| `WORKER_REDIS_HOST` | Worker | `master.bako-safe-hmg-elasticache...` (staging Redis) |
| `WORKER_REDIS_HOST_PROD` | Worker | `master.bako-safe-prod-elasticache...` (prod Redis) |
| `WORKER_SHARED_SECRET` | Worker + API | Shared secret for `/notify-result` auth (optional) |
| `API_URL` | API staging | `https://stg-api.bako.global` |
| `API_URL` | API prod | `https://api.bako.global` |
| `REDIS_URL_WRITE` | API staging | `rediss://master.bako-safe-hmg-elasticache...:6379` |
| `REDIS_URL_WRITE` | API prod | `rediss://master.bako-safe-prod-elasticache...:6379` |

If `WORKER_REDIS_HOST_PROD` is not set, the worker only consumes from the default Redis.

---

## Entry Point Mapping

All on-chain send paths converge to `enqueueTransactionSubmit()`. No component sends directly to the blockchain outside this path.

| # | Location | Trigger | Entry path |
|---|----------|---------|------------|
| 1 | `controller.ts` — `signByID()` | Signature quorum reached | `PUT /transaction/sign/:hash` |
| 2 | `controller.ts` — `send()` | Explicit send call | `POST /transaction/send/:hash` |

### Who calls these endpoints

```
                                  ┌──────────────────────────────────────┐
                                  │       enqueueTransactionSubmit()     │
                                  └──────────┬──────────────┬────────────┘
                                             │              │
                            signByID()       │    send()     │
                                             │              │
                  ┌──────────────────────────┤              │
                  │                          │              │
       PUT /sign/:hash              PUT /sign/:hash    POST /send/:hash
            │                            │                  │
  ┌─────────┴──────────┐     ┌───────────┴────────┐   ┌────┴──────────────────┐
  │  UI: user signs    │     │ Socket Server:      │   │ SDK: BakoProvider     │
  │  from vault        │     │ TX_SIGN handler     │   │   .send(hash)         │
  │  dashboard         │     │ (dApp flow)         │   │   → Service           │
  │                    │     │                     │   │   .sendTransaction()  │
  └────────────────────┘     └─────────────────────┘   └───────────────────────┘
```

---

## Fat Job Payload

The API serializes all data needed for submission into the job. The worker is stateless — no DB access required for transaction processing.

```typescript
{
  hash: string;                  // transaction hash
  transactionId: string;         // transaction UUID (for notify-result callback)
  apiUrl: string;                // API URL of the originating environment
  networkUrl: string;            // Fuel provider URL (blockchain)
  txData: TransactionRequest;    // full transaction data (inputs, outputs, witnesses)
  resume: ITransactionResume;    // witnesses with signatures, requiredSigners
  predicateConfigurable: string; // vault configurable (JSON string)
  predicateVersion: string;      // predicate version
}
```

---

## Retry Configuration

| Parameter | Value |
|-----------|-------|
| Max attempts | 120 |
| Backoff | Cyclic: +5s per attempt, resets every 5 |
| Delay pattern | 5s, 10s, 15s, 20s, 25s, 5s, 10s, 15s, 20s, 25s, ... |
| Worst case total | ~30 minutes until terminal FAILED (24 cycles x 75s) |

### Error classification

- **Transient** (retry): ECONNREFUSED, ETIMEDOUT, ENOTFOUND, socket hang up, network error, timeout, 502, 503, 504, rate limit, AbortError, FetchError
- **Permanent** (FAILED immediately): insufficient funds, predicate validation, invalid signature, not enough coins

### Timing diagram (worst case)

```
Each cycle: 5s + 10s + 15s + 20s + 25s = 75s

Cycle  1-5:   75s each   (375s cumulative)
Cycle  6-10:  75s each   (750s cumulative)
Cycle 11-15:  75s each   (1125s cumulative)
Cycle 16-20:  75s each   (1500s cumulative)
Cycle 21-24:  75s each   (1800s cumulative)
                          ~30 min → FAILED
```

---

## Attempt Auditing

New column `retry_attempts jsonb` (array) on the `transactions` table. Consecutive attempts with the same error are grouped into a single entry to avoid duplication:

```typescript
{
  error: string | null,      // error message (null on success)
  first_attempt: number,     // first attempt in this group
  last_attempt: number,      // last attempt in this group
  count: number,             // how many consecutive attempts with this error
  first_timestamp: string,   // ISO — when first attempt happened
  last_timestamp: string,    // ISO — when last attempt happened
  avg_duration_ms: number,   // average attempt duration in ms
}
```

Example: 85 consecutive ETIMEDOUT errors followed by a 503 phase and then success:
```json
[
  { "error": "ETIMEDOUT", "first_attempt": 1, "last_attempt": 85, "count": 85, "avg_duration_ms": 5000 },
  { "error": "503", "first_attempt": 86, "last_attempt": 100, "count": 15, "avg_duration_ms": 3200 },
  { "error": null, "first_attempt": 101, "last_attempt": 101, "count": 1, "avg_duration_ms": 2100 }
]
```

---

## Notify Result Endpoint

`POST /transaction/notify-result/:id` — internal endpoint called by the worker after on-chain submission.

### Authentication

- If `WORKER_SHARED_SECRET` is configured: validates `x-worker-secret` header
- If not configured: endpoint is open (for dev/staging without the secret)

### Request body

```typescript
{
  status: "success" | "failed";
  gasUsed?: string;
  errorData?: any;
  retryAttempts?: RetryAttemptEntry[];
}
```

### What it does

1. Validates shared secret (if configured)
2. Validates status is terminal (success or failed)
3. Updates transaction in DB (status, sendTime, gasUsed, resume, retryAttempts)
4. Sends email + in-app notification on success
5. Invalidates Redis cache (balance + transactions)
6. Emits socket `[TRANSACTION]` with fully formatted transaction data + history

---

## Deduplication

Jobs use a deterministic `jobId: tx_submit_{hash}`. Bull prevents duplicate jobs with the same ID.

| Job state | New enqueue with same hash | Result |
|-----------|---------------------------|--------|
| waiting/active/delayed | Skipped (logged) | Protected |
| completed (`removeOnComplete: true`) | Accepted (job was removed) | Re-send works |
| failed (`removeOnFail: false`) | Previous job removed, new one created | Manual retry via `/send/:hash` works |

---

## Modified Files

### Worker (`packages/worker/`)

| File | Action |
|------|--------|
| `package.json` | Add `bakosafe@0.6.3` |
| `src/queues/submitTransaction/types.ts` | Fat job type + audit entry type |
| `src/queues/submitTransaction/constants.ts` | Queue name, max attempts, backoff config |
| `src/queues/submitTransaction/utils.ts` | `isTransientError()` |
| `src/queues/submitTransaction/queue.ts` | Stateless processor, dual Redis, notify-result callback |
| `src/queues/submitTransaction/index.ts` | Exports |
| `src/index.ts` | Register both queues in Bull Board |

### API (`packages/api/`)

| File | Action |
|------|--------|
| `package.json` | Add `bull@^4.16.5`, `ioredis@^5.7.0` |
| `src/utils/submitTransactionQueue.ts` | Bull producer with fat job payload |
| `src/modules/transaction/controller.ts` | `signByID`/`send`: enqueue fat job; `notifyResult`: update DB + notify + socket |
| `src/modules/transaction/routes.ts` | Add `POST /notify-result/:id` route |
| `src/models/Transaction.ts` | Add `retryAttempts` column |
| `src/migrations/` | `AddRetryAttemptsToTransactions` |

### Frontend (`bako-safe-ui-stg`)

| File | Action |
|------|--------|
| `src/modules/transactions/hooks/send/useSendTransaction.ts` | `handleAsyncResult`: listens socket for tx completion, resolves loading toast |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Infinite loop with BakoProvider** | Worker uses `Provider` from fuels, never `BakoProvider`. Enforced by code comment and architecture. |
| **Duplicate tx on-chain** | `vault.send()` ok but `waitForResult()` times out → check on-chain before retrying |
| **Worker/API bakosafe version mismatch** | Keep same version in both package.json files |
| **notify-result abuse** | Shared secret validation via `WORKER_SHARED_SECRET` + only accepts terminal statuses |
| **Bull queue loses jobs** | `removeOnFail: false` keeps failed jobs visible; Redis with AOF persistence |
| **Worker restart loses in-memory retry attempts** | Attempts are re-accumulated from scratch on restart; worst case is less granular audit data |
| **API_URL not configured** | Fat job carries `apiUrl` — if empty, notify-result silently fails; transaction stays PENDING_SENDER |
