# Cache Strategy Documentation

This document describes the caching strategies implemented in the Bsafe API to optimize performance and reduce blockchain RPC calls.

## Overview

The API implements Redis-based caching for two main resources:
1. **Balance Cache** - Caches wallet balances per predicate
2. **Transaction Cache** - Caches confirmed transactions (deposits) from the Fuel blockchain

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Request                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Redis Cache Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Balance Cache  │  │ Transaction     │  │  Session/Quote  │  │
│  │  (TTL: 5min)    │  │ Cache (10min)   │  │  Cache          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (on cache miss)
┌─────────────────────────────────────────────────────────────────┐
│                    Fuel Blockchain (RPC)                         │
│  - getBalances()                                                 │
│  - getTransactionsSummaries()                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Balance Cache

### Purpose
Caches `provider.getBalances()` results to reduce RPC calls. Wallet balances don't change frequently unless a transaction occurs.

### Key Structure
```
balance:{predicateAddress}:{chainId}
```

### Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_BALANCE_CACHE` | `true` | Enable/disable balance cache |
| `BALANCE_CACHE_TTL` | `300` | Cache TTL in seconds (5 minutes) |
| `BALANCE_INVALIDATION_TTL` | `3600` | Invalidation flag TTL (1 hour) |

### Features
- **Automatic invalidation**: Cache is invalidated when a transaction is confirmed
- **Granular invalidation**: Invalidates only the affected chain, not all chains
- **BigNumber serialization**: Properly handles Fuel's BigNumber format

### Invalidation Triggers
- Transaction confirmed (`TransactionService.sendToChain`)
- Transaction closed (`TransactionController.close`)

---

## 2. Transaction Cache

### Purpose
Caches confirmed transactions (deposits) from the Fuel blockchain. Since confirmed transactions are **immutable**, they can be cached for longer periods.

### Key Structure
```
tx:{predicateAddress}:{chainId}         # Transaction data
tx:refresh:{predicateAddress}:{chainId} # Refresh flag
```

### Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSACTION_CACHE_TTL` | `600` | Cache TTL in seconds (10 minutes) |
| `TRANSACTION_INCREMENTAL_LIMIT` | `10` | Number of recent txs to fetch on refresh |

### Incremental Refresh Strategy

Instead of invalidating and refetching all transactions, the cache uses an **incremental refresh** approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Normal Cache Hit                              │
│  1. Check cache exists                                           │
│  2. Check refresh flag NOT set                                   │
│  3. Return cached transactions                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                Incremental Refresh (on invalidation)             │
│  1. Check cache exists                                           │
│  2. Check refresh flag IS set                                    │
│  3. Fetch only last N transactions (default: 10)                 │
│  4. Merge new txs with cached (deduplicate by hash)              │
│  5. Update cache with merged data                                │
│  6. Clear refresh flag                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Full Fetch (cache miss)                       │
│  1. No cache exists                                              │
│  2. Fetch all transactions (up to 57)                            │
│  3. Store in cache                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Why Incremental?

| Scenario | Full Invalidation | Incremental Refresh |
|----------|-------------------|---------------------|
| Cache HIT | ~5ms | ~5ms |
| After invalidation | ~1000ms (57 txs) | ~200ms (10 txs) |
| Data freshness | Stale until refetch | Always fresh on next request |

Since confirmed transactions are immutable, we only need to fetch **new** transactions and merge them with the cached ones.

### Deduplication

Transactions are deduplicated by their `hash` or `id`:

```typescript
// Known hashes stored in cache
knownHashes: ['0xabc...', '0xdef...', ...]

// New transactions filtered
newTxs.filter(tx => !knownHashes.has(tx.hash))
```

---

## 3. Warm-up Strategy

On user login, the API pre-warms the balance cache for the user's predicates.

### Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `WARMUP_ENABLED` | `true` | Enable/disable warmup |
| `WARMUP_CONCURRENCY` | `5` | Max concurrent balance fetches |
| `WARMUP_MAX_PREDICATES` | `20` | Max predicates to warm per user |
| `WARMUP_SKIP_CACHED` | `true` | Skip predicates already in cache |

### Optimization Details
- Orders predicates by `updatedAt DESC` (most recently used first)
- Limits to `maxPredicates` per warmup
- Checks if cache already exists before fetching
- Uses global `chainId` cache to avoid extra RPC calls

---

## 4. Global ChainId Cache

The `FuelProvider` maintains a global cache of `chainId` per provider URL to avoid repeated `getChainId()` calls.

```typescript
FuelProvider.getChainId(url) // Uses cache or fetches once
```

---

## 5. Internal Endpoints

For debugging and management, the following internal endpoints are available:

### Balance Cache
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/internal/cache/stats` | GET | Cache statistics |
| `/internal/cache/keys` | GET | List cache keys |
| `/internal/cache/invalidate` | POST | Manually invalidate cache |
| `/internal/cache/warmup` | POST | Trigger manual warmup |
| `/internal/cache/metrics/reset` | POST | Reset metrics |

### Request Examples

```bash
# Get cache stats
curl http://localhost:3333/internal/cache/stats

# Invalidate specific predicate
curl -X POST http://localhost:3333/internal/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"predicateAddress": "0x123..."}'

# Warmup for user
curl -X POST http://localhost:3333/internal/cache/warmup \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid", "networkUrl": "https://..."}'
```

---

## 6. Metrics

Cache performance is tracked via `CacheMetrics`:

```typescript
CacheMetrics.hit()    // Increment hit counter
CacheMetrics.miss()   // Increment miss counter
CacheMetrics.error()  // Increment error counter
CacheMetrics.warmup(count) // Track warmup operations
```

Access via `/internal/cache/stats`:
```json
{
  "hits": 1234,
  "misses": 56,
  "errors": 2,
  "warmups": 100,
  "hitRate": "95.67%"
}
```

---

## 7. Best Practices

### When to Invalidate
- After any transaction state change (confirmed, closed)
- When predicate configuration changes
- On explicit user request (force refresh)

### When NOT to Invalidate
- On read operations
- On transaction creation (before confirmation)
- On signature additions (transaction still pending)

### TTL Guidelines
| Resource | Volatility | Recommended TTL |
|----------|------------|-----------------|
| Balances | Medium (changes on tx) | 5 minutes |
| Confirmed Txs | None (immutable) | 10+ minutes |
| Quotes | High | 1-5 minutes |
| Sessions | Low | 40 minutes |

---

## 8. Troubleshooting

### High Cache Miss Rate
1. Check TTL settings - may be too short
2. Verify invalidation isn't being triggered too often
3. Check Redis connection health

### Stale Data
1. Verify invalidation triggers are working
2. Check if refresh flags are being set correctly
3. Review transaction confirmation flow

### Memory Issues
1. Monitor Redis memory usage
2. Consider reducing TTLs
3. Implement cache eviction policies if needed

---

## 9. Future Improvements

- [ ] Add cache compression for large transaction lists
- [ ] Implement cache warming on deployment
- [ ] Add distributed cache invalidation (pub/sub)
- [ ] Implement circuit breaker for Redis failures
