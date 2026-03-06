# Transaction Cron

A cron job responsible for automatically executing transactions on the Fuel network from configured vaults. On each execution, a vault is randomly selected from the available ones and a transaction is sent using the locally configured signers.

---

## File structure

```
src/queues/generateTestTx/
├── config/                  # Folder containing vault configuration JSON files
│   ├── vault_1.json
│   ├── vault_2.json
│   └── ...
├── utils/
│   ├── loader.ts            # Reads and validates the selected JSON
│   ├── vault.ts             # Instantiates the Vault from the config
│   └── signer.ts            # Signs the transaction by network type (Fuel/EVM)
├── types.ts                 # Shared interfaces and enums
├── constants.ts             # Queue constants and execution interval
├── queue.ts                 # Bull job processor
└── scheduler.ts             # Configures and schedules jobs
```

---

## How it works

1. When the worker starts, `TransactionCron` clears old jobs from Redis and schedules two jobs:
   - **Immediate** — runs as soon as the worker starts
   - **Recurring** — runs at every interval defined in `REPEAT_INTERVAL_MS`, with an initial delay to avoid colliding with the immediate job

2. On each execution, `loader.ts` randomly picks a JSON file from the `config/` folder, avoiding repeating the last used vault. The JSON is validated with **Zod** on every read — invalid configs throw a descriptive error.

3. With the config loaded, `vault.ts` instantiates the `Vault` from the `bakosafe` SDK with the configured signers, padded to 10 positions as required by the predicate.

4. `signer.ts` iterates over the signers and loads each private key from the environment variable defined in `envKey`. Signers whose environment variable is not set are silently skipped.

5. The transaction is sent with the collected witnesses. If an error occurs, the logger records it along with gas estimation details and the job is marked as failed in Redis (no retries).

---

## Configuring a vault

Create a `.json` file inside `src/queues/generateTestTx/config/`. The filename can be anything, as long as it ends in `.json`.

```json
{
  "vault": {
    "signaturesCount": 2,
    "hashPredicate": "0xc5baa01086a27ebe7fdd676485887b380a0595f2becbd1d60e6c16bba58dd888",
    "version": "0x967aaa71b3db34acd8104ed1d7ff3900e67cff3d153a0ffa86d85957f579aa6a",
    "signers": [
      {
        "address": "0x2bba3b154de16722ddbdbf40843c8464f773638c5383c4aa46d69e611fb3e199",
        "type": "fuel",
        "envKey": "VAULTCONFIG_SIGNER_1_KEY"
      },
      {
        "address": "0xAbCdEf1234567890abcdef1234567890abcdef12",
        "type": "evm",
        "envKey": "VAULTCONFIG_SIGNER_2_KEY"
      }
    ]
  },
  "network": "mainnet",
  "defaultAmount": "0.000000001"
}
```

Then add the corresponding private keys to your `.env` file:

```env
VAULTCONFIG_SIGNER_1_KEY=0xYOUR_FUEL_PRIVATE_KEY
VAULTCONFIG_SIGNER_2_KEY=0xYOUR_EVM_PRIVATE_KEY
```

### Fields

| Field | Description |
|---|---|
| `signaturesCount` | Minimum number of signatures required for the transaction to be valid |
| `hashPredicate` | Hash of the vault predicate (obtained at deploy time) |
| `version` | bakosafe predicate version |
| `signers` | List of up to 10 signers |
| `network` | Fuel network (`mainnet`, `testnet`) |
| `defaultAmount` | Amount to send in the transaction (in ETH) |

### Signer fields

| Field | Description |
|---|---|
| `address` | B256 address for Fuel, `0x` address for EVM |
| `type` | Network type: `fuel` or `evm` |
| `envKey` | Name of the environment variable that holds the private key for this signer |

> **Important:** the `address` must correspond to the private key stored in the environment variable defined by `envKey`. If they don't match, the predicate will reject the signature.

---

## Signer types

### Fuel

Signs using `WalletUnlocked` from the `fuels` SDK directly with the `hashTxId`.

```json
{
  "address": "0x2bba3b...",
  "type": "fuel",
  "envKey": "VAULT_1_SIGNER_1_KEY"
}
```

### EVM

Signs using `ethers.Wallet`. The message format is automatically detected based on the predicate version: recent versions use `encodedTxId` directly; legacy versions use `arrayify(stringToHex(hashTxId))`.

```json
{
  "address": "0xAbCdEf...",
  "type": "evm",
  "envKey": "VAULT_1_SIGNER_2_KEY"
}
```

### External signer (no env key set)

If the environment variable defined in `envKey` is not set, the signer is skipped by the cron. Use this pattern to register real user addresses in the vault — the address must be in the signers array for the predicate to recognize it, but the signature is not collected automatically.

```json
{
  "address": "0xUserAddress...",
  "type": "fuel",
  "envKey": "VAULT_1_USER_KEY"
}
```

---

## Adding a new vault

1. Create a new JSON file in the `config/` folder following the model above
2. Set `envKey` for each signer and add the corresponding private keys to `.env`
3. Make sure the vault has enough balance to cover the gas fee
4. No worker restart needed — the loader reads the files on every execution

---

## Interval configuration

The execution interval can be set via environment variable:

```env
TRANSACTION_CRON_INTERVAL_MS=1200000
```

If not set, it defaults to 20 minutes. The interval is always relative to the last execution, not the system clock.

---

## Error logs

Every failed job logs a structured `gas` field alongside the error to help diagnose the failure:

```json
{
  "error": { "message": "...", "name": "FuelError" },
  "gas": {
    "maxFee": "1500",
    "gasPrice": "1",
    "balance": "800",
    "isInsufficient": true
  }
}
```

| Field | Description |
|---|---|
| `maxFee` | Estimated maximum fee for the transaction |
| `gasPrice` | Current network gas price |
| `balance` | Current vault balance |
| `isInsufficient` | `true` if balance is lower than the estimated fee |

All fields show `"unavailable"` when the error occurs before the vault balance can be fetched.

---

## Important notes

- **Balance:** Each vault must have enough balance to cover gas. If the balance is insufficient, the job fails and the error is recorded by the logger with gas details.
- **Private keys:** Never put private keys directly in JSON config files. Always use environment variables via `envKey`. Never commit `.env` files with real values — use `.env.example` as a reference.
- **Redis:** Failed jobs are stored in Redis for inspection via Bull Dashboard. Successful jobs are automatically removed.
- **SDK version:** The worker uses `bakosafe` + `fuels`. If the network's `fuel-core` version differs from what the SDK supports, a compatibility warning may appear in the logs — it does not block execution, but keeping the SDK up to date is recommended.
