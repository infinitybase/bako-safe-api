# RFC: Bull Queue for Transaction Submission

**Date:** 2026-04-08
**Status:** Proposal
**Author:** Guilherme Roque

---

## Problem

`sendToChain()` lives in the API and is called synchronously, blocking the HTTP response. If `vault.send()` fails (network timeout, provider unavailable, gas estimation error), the transaction is permanently marked as `FAILED` with no retry. Additionally, it blocks the HTTP response indefinitely while waiting for on-chain confirmation.

## Entry Point Mapping

All on-chain send paths converge to `sendToChain()` in `services.ts:600`. No component sends directly to the blockchain outside this method.

### Direct call sites of `sendToChain()`

| # | Location | Trigger | Entry path |
|---|----------|---------|------------|
| 1 | `controller.ts:561` — `signByID()` | Signature quorum reached | `PUT /transaction/sign/:hash` |
| 2 | `controller.ts:861` — `send()` | Explicit send call | `POST /transaction/send/:hash` |

### Who calls these endpoints

```
                                    ┌─────────────────────────────────────┐
                                    │         sendToChain()               │
                                    │         services.ts:600             │
                                    └──────────┬──────────────┬───────────┘
                                               │              │
                              signByID()       │    send()     │
                              controller:561   │    controller:861
                                               │              │
                    ┌──────────────────────────┤              │
                    │                          │              │
         PUT /sign/:hash              PUT /sign/:hash    POST /send/:hash
              │                            │                  │
              │                            │                  │
    ┌─────────┴──────────┐     ┌───────────┴────────┐   ┌────┴──────────────────┐
    │  UI: user signs    │     │ Socket Server:      │   │ SDK: BakoProvider     │
    │  from vault        │     │ TX_SIGN handler     │   │   .send(hash)         │
    │  dashboard         │     │ (dApp flow)         │   │   → Service           │
    │                    │     │                     │   │   .sendTransaction()  │
    └────────────────────┘     └─────────────────────┘   └───────────────────────┘
                                        │
                                        │ (previous step)
                                ┌───────┴───────────┐
                                │ Socket Server:     │
                                │ TX_CREATE handler  │
                                │ vault.BakoTransfer │
                                │ (only CREATES tx,  │
                                │  does NOT send)    │
                                └────────────────────┘
```

### Flow 1: User signs from vault dashboard (UI)

```
UI → useSendTransaction() → Vault.send() with BakoProvider
   → BakoProvider.send(hash) → Service.sendTransaction(hash)
   → POST /transaction/send/:hash → sendToChain()
```

### Flow 2: dApp via socket (connector)

```
dApp Connector → Socket TX_REQUEST → Socket Server creates recovery code
              → Socket TX_CREATE → Socket Server calls vault.BakoTransfer() (only saves tx to DB)
              → UI displays tx for user review
              → User signs → Socket TX_SIGN
              → Socket Server calls PUT /transaction/sign/:hash on the API
              → signByID() checks quorum → sendToChain()
```

The socket server is an authentication intermediary (temporary 2-min recovery codes). It **never** sends on-chain — it delegates to the API via `PUT /sign/:hash`.

### Flow 3: Standalone SDK (without BakoProvider)

```
Vault.send() with regular Provider → provider.operations.submit() → direct to blockchain
```

This flow **does not go through the API** — it's for standalone SDK usage, outside the Bako Safe ecosystem. Not affected by the queue.

### Conclusion

Replacing `sendToChain()` with `enqueueTransactionSubmit()` at the **2 API call sites** (signByID and send) covers all app flows: direct signing, SDK-based sending, and dApp flow via socket.

## Before vs After

### How it works TODAY

```
User signs → quorum reached → API calls vault.send() immediately
                                         │
                                    blocks HTTP
                                    waiting for blockchain
                                         │
                                    ┌─────┴──────┐
                                    │             │
                                 success       failure
                                 STATUS=SUCCESS  STATUS=FAILED
                                                 (permanent, no retry)
```

- HTTP response only returns after blockchain confirms (or fails)
- Network error, timeout, provider down — that's it. Tx dies as FAILED
- User must create a new tx from scratch

### How it will work AFTER

```
User signs → quorum reached → API enqueues to Bull → HTTP 200 immediate
                                                              │
                                                    Worker picks from queue
                                                    calls vault.send()
                                                              │
                                                    ┌─────────┴──────────┐
                                                    │                    │
                                                 success              failure
                                                 STATUS=SUCCESS          │
                                                                   transient error?
                                                                   (network, timeout)
                                                                    ┌────┴────┐
                                                                   YES       NO
                                                                    │         │
                                                              Bull retries  STATUS=FAILED
                                                              up to 20x     (permanent)
                                                              (5s,10s,15s,20s,25s,
                                                               5s,10s,15s,20s,25s...)
```

### Key differences

| Aspect | Before | After |
|--------|--------|-------|
| HTTP response | Blocks until blockchain confirms | Returns immediately |
| Network/timeout failure | Tx dies as FAILED | Bull retries up to 20x over ~5 min |
| Permanent error (funds, signature) | FAILED | FAILED (same) |
| Attempt auditing | None | `retry_attempts` column with timestamp, error, duration |
| Frontend changes | — | None. Tx shows "Sending..." during retries, socket notifies on resolution |

---

## Solution

Create a Bull queue `QUEUE_SUBMIT_TRANSACTION` in the worker. Every transaction that reaches quorum is enqueued. The worker executes the send logic (build Vault, `vault.send()`, `waitForResult()`) with automatic retry on transient errors.

## Architecture Decisions

### 1. Send logic moves to the worker

`sendToChain` moves from the API to the Bull queue processor in the worker. Add `bakosafe` as a worker dependency (already has `fuels@0.103.0`). Eliminates coupling of a heavy operation to the HTTP cycle.

### 2. API only enqueues

`signByID` and `send` now call `enqueueTransactionSubmit(hash, networkUrl)` and return immediately. The API gains `bull` and `ioredis` as dependencies (producer only — never consumer).

### 3. Worker accesses DB directly

Already has `PsqlClient` (raw SQL via `pg`). Fetches transaction, predicate, updates status, records attempts. Does not use TypeORM.

### 4. Worker emits socket events

Uses `socket.io-client` (same lib the API uses in `SocketClient`) to notify vault members in real time after success or failure.

### 5. Error classification

- **Transient** (retry): ECONNREFUSED, ETIMEDOUT, ENOTFOUND, socket hang up, network error, timeout, 502, 503, 504, rate limit, AbortError, FetchError
- **Permanent** (FAILED): insufficient funds, predicate validation, invalid signature, not enough coins

If transient and attempts remain: status stays `PENDING_SENDER`, Bull retries. If permanent or attempts exhausted: status goes to `FAILED`.

### 6. Automatic retry — no manual retry

Fully automatic system. No manual retry endpoint, no button in the frontend.

### 7. Retry configuration

| Parameter | Value |
|-----------|-------|
| Max attempts | 120 |
| Backoff | Cyclic: +5s per attempt, resets every 5 |
| Delay pattern | 5s, 10s, 15s, 20s, 25s, 5s, 10s, 15s, 20s, 25s, ... |
| Worst case total | ~30 minutes until terminal FAILED (24 cycles x 75s) |

Backoff implemented via Bull's custom `backoffStrategies`:

```typescript
backoffStrategies: {
  cyclic: (attemptsMade: number) => {
    const position = ((attemptsMade - 1) % 5) + 1;
    return position * 5000;
  },
}
```

### 8. Attempt auditing

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
  { "error": "ETIMEDOUT", "first_attempt": 1, "last_attempt": 85, "count": 85, "avg_duration_ms": 5000, ... },
  { "error": "503", "first_attempt": 86, "last_attempt": 100, "count": 15, "avg_duration_ms": 3200, ... },
  { "error": null, "first_attempt": 101, "last_attempt": 101, "count": 1, "avg_duration_ms": 2100, ... }
]
```

---

## Flow

```
1. signByID: quorum reached
   → enqueueTransactionSubmit(hash, networkUrl)
   → HTTP 200 returns immediately

2. Bull queue: job arrives at worker

3. Worker processor:
   a. Fetch transaction from Postgres (status, txData, resume, network)
   b. Fetch predicate (configurable, version)
   c. Create FuelProvider with network URL
   d. Instantiate Vault (bakosafe) with configurable and version
   e. Extract witnesses (signatures) from resume
   f. Build TransactionRequest via transactionRequestify()
   g. vault.send(tx) + waitForResult()

4. Result:
   SUCCESS
     → UPDATE status='success', gasUsed, retry_attempts
     → Emit socket TRANSACTION_UPDATED to members
     → Bull marks job as completed

   TRANSIENT ERROR (attempts remaining)
     → UPDATE retry_attempts (record attempt)
     → Status remains PENDING_SENDER
     → throw → Bull retries with cyclic backoff

   PERMANENT ERROR or LAST ATTEMPT
     → UPDATE status='failed', retry_attempts
     → Emit socket TRANSACTION_UPDATED to members
     → Bull marks job as completed
```

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

## Modified files

### Worker (`packages/worker/`)

| File | Action |
|------|--------|
| `package.json` | Add `bakosafe@0.6.3`, `socket.io-client@4.7.5` |
| `src/queues/submitTransaction/types.ts` | New — job types and audit entry |
| `src/queues/submitTransaction/constants.ts` | New — queue name, max attempts, backoff config |
| `src/queues/submitTransaction/utils.ts` | New — `isTransientError()` |
| `src/queues/submitTransaction/queue.ts` | New — processor with on-chain send logic |
| `src/queues/submitTransaction/index.ts` | New — exports |
| `src/index.ts` | Register queue in Bull Board |

### API (`packages/api/`)

| File | Action |
|------|--------|
| `package.json` | Add `bull@^4.16.5`, `ioredis@^5.7.0` |
| `src/utils/submitTransactionQueue.ts` | New — Bull producer + `enqueueTransactionSubmit()` |
| `src/modules/transaction/controller.ts` | `signByID` and `send`: replace `await sendToChain` with `enqueueTransactionSubmit` |
| `src/models/Transaction.ts` | Add `retryAttempts` column |
| `src/migrations/` | New migration: `AddRetryAttemptsToTransactions` |

### Removed/deprecated

| File | Action |
|------|--------|
| `src/modules/transaction/services.ts` | `sendToChain()` can be removed (logic moved to worker) |

---

## Frontend impact

No mandatory changes. The frontend already:
- Shows "Sending..." for `PENDING_SENDER` status
- Shows "Error" for `FAILED` status
- Listens to socket events `TRANSACTION_UPDATED` for real-time updates

Optional: display attempt count by reading `resume.retry.count` in the `Status.tsx` component.

---

## Verification

1. **Enqueue**: reach quorum in signByID, verify job appears in Bull Board (`/worker/queues`)
2. **Send**: verify worker executes `vault.send()` and tx appears on-chain
3. **Retry**: mock invalid provider URL, verify 120 attempts with cyclic backoff in Bull Board
4. **Auditing**: verify `retry_attempts` column with an entry per attempt
5. **Non-blocking**: signByID returns HTTP 200 before `vault.send()` completes
6. **Socket**: frontend receives real-time update via socket after success/failure

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Infinite loop with BakoProvider** | Worker MUST use `Provider` from fuels, NEVER `BakoProvider`. `Vault.send()` in bakosafe checks `provider instanceof BakoProvider` — if BakoProvider, it calls `POST /transaction/send/:hash` which enqueues again → infinite loop. With a regular `Provider`, it goes directly to the blockchain via `provider.operations.submit()`. The API currently uses `FuelProvider` (a `Provider` wrapper from fuels) — the worker must do the same. |
| Duplicate tx on-chain (vault.send ok but waitForResult timeout) | Before sending, check if tx hash already exists on-chain via provider |
| Worker and API with different bakosafe versions | Keep the same version in both package.json files |
| Resume JSONB concurrency (worker and API writing) | Worker is the only writer after enqueue — API only reads |
| Bull queue loses jobs (Redis restart) | `removeOnFail: false` keeps failed jobs visible; Redis with AOF persistence |
