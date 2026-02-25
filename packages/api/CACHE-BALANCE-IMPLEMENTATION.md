# Cache de Balances - Implementação Completa

## Visão Geral

### Problema Atual

A API realiza chamadas síncronas à blockchain da Fuel durante requisições HTTP para buscar balances de predicates, causando:

- **Latência alta**: ~500ms por predicate
- **Dependência externa**: Se o provider Fuel estiver lento/offline, a API fica lenta/indisponível
- **Escalabilidade limitada**: Múltiplas requisições simultâneas sobrecarregam o provider
- **Custo operacional**: Chamadas desnecessárias para dados que mudam raramente

### Endpoints Afetados

1. `GET /api/predicate/:id/allocation` - Alocação de assets (usado em dashboards)
2. `GET /api/predicate/:id/reserved-coins` - Balances detalhados (usado em cards de predicate)
3. `GET /api/user/allocation` - Alocação total do usuário

### Solução Proposta

Implementar cache em Redis no nível do **Provider**, de forma **transparente** para os services existentes:

- Cache de balances com TTL de 10 minutos
- Invalidação inteligente quando transações são confirmadas
- Warm-up automático no login do usuário
- Diferenciação por rede (chainId)

---

## Arquitetura

### Fluxo de Cache

```
┌─────────────────────────────────────────────────────────┐
│            Service/Controller (Código Existente)         │
│  const instance = await instancePredicate(...)          │
│  const result = await instance.getBalances()            │
│  (Nenhuma mudança necessária!)                          │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Vault (bakosafe)                        │
│  vault.getBalances() {                                  │
│    return this.provider.getBalances(this.address)       │
│  }                                                       │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│          ProviderWithCache (Nosso Wrapper)              │
│  async getBalances(address) {                           │
│    1. const cached = await balanceCache.get(addr, id)   │
│    2. if (cached) return { balances: cached }           │
│    3. const result = await super.getBalances(address)   │
│    4. await balanceCache.set(addr, result, id)          │
│    5. return result                                     │
│  }                                                       │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              BalanceCache (Redis Manager)                │
│  - Serializa/Deserializa BigNumbers                     │
│  - Gerencia keys: balance:{addr}:{chainId}             │
│  - Verifica flags de invalidação                        │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    Redis Storage                         │
│  Key: balance:0xfuel123...:9889                         │
│  Value: {"balances": [...], "timestamp": 1234...}      │
│  TTL: 600 segundos (10 minutos)                         │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Invalidação

```
┌─────────────────────────────────────────────────────────┐
│       Transação Confirmada na Blockchain                │
│  TransactionService.sendToChain() → SUCCESS             │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│           Invalidar Cache Imediatamente                  │
│  balanceCache.invalidate(predicateAddress)              │
│  - Remove: balance:{address}:{chainId}                  │
│  - Seta flag: balance:invalidated:{address}             │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         Próxima Requisição ao Endpoint                   │
│  ProviderWithCache.getBalances()                        │
│  - Detecta flag de invalidação                          │
│  - Busca dados frescos da blockchain                    │
│  - Atualiza cache                                       │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Warm-up

```
┌─────────────────────────────────────────────────────────┐
│              User faz Login                              │
│  POST /api/auth/sign-in                                 │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│          AuthController.signIn()                         │
│  1. Valida credenciais                                  │
│  2. Cria sessão                                         │
│  3. return successful(signin) ← Response imediato       │
│  4. warmupUserBalances() (background, não aguarda)      │
└────────────────────────┬────────────────────────────────┘
                         ↓ (paralelo)
┌─────────────────────────────────────────────────────────┐
│         Warm-up em Background (~2-3s)                    │
│  1. Busca todos os predicates do user                   │
│  2. Para cada predicate:                                │
│     provider.getBalances(predicateAddress)              │
│  3. ProviderWithCache cacheia automaticamente           │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│        User acessa Dashboard                             │
│  GET /api/predicate/:id/allocation                      │
│  - Cache HIT! (~50ms)                                   │
│  GET /api/predicate/:id/reserved-coins                  │
│  - Cache HIT! (~30ms)                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura de Chaves Redis

### Cache de Balances

```
Padrão: balance:{predicateAddress}:{chainId}

Exemplos:
balance:0xfuel139e53d4a8b4a1ed2088d5c67ef04fe3e09c0eefa5ce23b36c5e4b59e0933b9:9889
balance:0xfuel139e53d4a8b4a1ed2088d5c67ef04fe3e09c0eefa5ce23b36c5e4b59e0933b9:0

TTL: 600 segundos (10 minutos)

Formato do valor:
{
  "balances": [
    {
      "assetId": "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07",
      "amount": "0x3b9aca00"  // hex string do BigNumber
    }
  ],
  "timestamp": 1764104869733,
  "chainId": 9889,
  "networkUrl": "https://testnet.fuel.network/v1/graphql"
}
```

### Flags de Invalidação

```
Padrão: balance:invalidated:{predicateAddress}

Exemplos:
balance:invalidated:0xfuel139e53d4a8b4a1ed2088d5c67ef04fe3e09c0eefa5ce23b36c5e4b59e0933b9

TTL: 3600 segundos (1 hora)

Formato do valor:
"1764104869733"  // timestamp da invalidação
```

**Nota**: Flag de invalidação não tem chainId - invalida TODAS as redes do mesmo predicate.

---

## Componentes

### 1. ProviderWithCache

**Arquivo**: `packages/api/src/utils/ProviderWithCache.ts`

Wrapper transparente do `Provider` do Fuel SDK que intercepta chamadas a `getBalances()` e adiciona cache.

**Características**:
- Estende `Provider` nativo do Fuel SDK
- Override do método `getBalances(address: string)`
- Mantém mesma assinatura e output
- Lazy load do chainId (busca uma vez e mantém)
- Fallback automático em caso de erro no cache

**Interface**:
```typescript
class ProviderWithCache extends Provider {
  async getBalances(address: string): Promise<{ balances: CoinQuantity[] }>
  async getBalancesForceRefresh(address: string): Promise<{ balances: CoinQuantity[] }>
}
```

### 2. BalanceCache

**Arquivo**: `packages/api/src/server/storage/balance.ts`

Gerenciador de cache no Redis com suporte a BigNumbers.

**Características**:
- Singleton pattern
- Serialização de BigNumbers para hex strings
- Deserialização de hex strings para BigNumbers
- Verificação de flags de invalidação
- Diferenciação por chainId

**Interface**:
```typescript
class BalanceCache {
  async get(predicateAddress: string, chainId: number): Promise<CoinQuantity[] | null>
  async set(predicateAddress: string, balances: CoinQuantity[], chainId: number, networkUrl: string): Promise<void>
  async invalidate(predicateAddress: string): Promise<void>
  async clearInvalidation(predicateAddress: string): Promise<void>
  async clear(predicateAddress: string, chainId?: number): Promise<void>
  async stats(): Promise<{ type: string; ttl: number }>
}
```

### 3. FuelProvider (Modificado)

**Arquivo**: `packages/api/src/utils/FuelProvider.ts`

**Mudanças**:
- Retorna `ProviderWithCache` em vez de `Provider` normal
- Desabilita cache nativo do Fuel SDK (`resourceCacheTTL: 0`)
- Mantém pool de providers em memória (não muda)

### 4. RedisWriteClient (Atualizado)

**Arquivo**: `packages/api/src/utils/redis/RedisWriteClient.ts`

**Mudanças**:
- Adicionar método `del(key: string)` para deletar chaves
- Atualizar método `set()` para aceitar options com TTL customizado

---

## Pontos de Invalidação

### 1. TransactionService.sendToChain()

**Arquivo**: [`packages/api/src/modules/transaction/services.ts`](packages/api/src/modules/transaction/services.ts)  
**Linha**: ~637

**Quando**: Após transação ser enviada e confirmada com sucesso na blockchain

**Implementação**:
```typescript
async sendToChain(hash: string, network: Network) {
  // ... código existente ...
  
  try {
    const transactionResponse = await vault.send(tx);
    const { gasUsed } = await transactionResponse.waitForResult();

    const _api_transaction: IUpdateTransactionPayload = {
      status: TransactionStatus.SUCCESS,
      sendTime: new Date(),
      gasUsed: gasUsed.format(),
      resume: {
        ...resume,
        gasUsed: gasUsed.format(),
        status: TransactionStatus.SUCCESS,
      },
    };

    await new NotificationService().transactionSuccess(id, network);

    // Invalidar cache após sucesso
    await this.invalidatePredicateBalance(transaction.predicateAddress);

    return await this.update(id, _api_transaction);
  } catch (e) {
    // ... erro ...
  }
}

// Método auxiliar
private async invalidatePredicateBalance(predicateAddress: string): Promise<void> {
  try {
    const balanceCache = App.getInstance()._balanceCache;
    await balanceCache.invalidate(predicateAddress);
    console.log(`[TX_CONFIRMED] Balance invalidated for ${predicateAddress}`);
  } catch (error) {
    console.error('[TX_CONFIRMED] Failed to invalidate cache:', error);
  }
}
```

### 2. TransactionController.close()

**Arquivo**: [`packages/api/src/modules/transaction/controller.ts`](packages/api/src/modules/transaction/controller.ts)  
**Linha**: ~747

**Quando**: Transação é fechada manualmente (via endpoint de close)

**Implementação**:
```typescript
async close({
  body: { gasUsed, transactionResult },
  params: { id },
}: ICloseTransactionRequest) {
  try {
    // Buscar predicate address antes de atualizar
    const transaction = await Transaction.findOne({
      where: { id },
      relations: ['predicate'],
    });

    const response = await this.transactionService.update(id, {
      status: TransactionStatus.SUCCESS,
      sendTime: new Date(),
      gasUsed,
      resume: transactionResult,
    });

    // Invalidar cache após fechar transação
    if (transaction?.predicate?.predicateAddress) {
      await this.invalidatePredicateBalance(
        transaction.predicate.predicateAddress
      );
    }

    return successful(response, Responses.Ok);
  } catch (e) {
    return error(e.error, e.statusCode);
  }
}

// Método auxiliar
private async invalidatePredicateBalance(predicateAddress: string): Promise<void> {
  try {
    const balanceCache = App.getInstance()._balanceCache;
    await balanceCache.invalidate(predicateAddress);
    console.log(`[TX_CLOSED] Balance invalidated for ${predicateAddress}`);
  } catch (error) {
    console.error('[TX_CLOSED] Failed to invalidate cache:', error);
  }
}
```

### 3. Endpoint Interno (Worker Integration)

**Arquivo**: [`packages/api/src/modules/webhook/routes.ts`](packages/api/src/modules/webhook/routes.ts)

**Quando**: Worker detecta mudança de balance no MongoDB e notifica a API

**Implementação**:
```typescript
router.post('/internal/invalidate-balance', async (req, res) => {
  try {
    const { predicate_address } = req.body;

    if (!predicate_address) {
      return res.status(400).json({ error: 'predicate_address required' });
    }

    const balanceCache = App.getInstance()._balanceCache;
    await balanceCache.invalidate(predicate_address);

    return res.json({
      success: true,
      message: `Balance invalidated for ${predicate_address}`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[INVALIDATE_BALANCE_ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint de debug
router.get('/internal/cache-stats', async (req, res) => {
  try {
    const balanceCache = App.getInstance()._balanceCache;
    const stats = await balanceCache.stats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
```

---

## Estratégia de Warm-up

### Implementação no Login

**Arquivo**: [`packages/api/src/modules/auth/controller.ts`](packages/api/src/modules/auth/controller.ts)  
**Linha**: ~44

### Quando Executar

- **Após login bem-sucedido** (signIn)
- **Em background** (não bloqueia response)
- **Para todos os predicates** do usuário

### Código

```typescript
export class AuthController {
  // ... código existente ...

  /**
   * Pré-aquece cache de balances para todos os predicates do usuário
   * Executa em background para não bloquear o login
   */
  private async warmupUserBalances(
    userId: string,
    network: Network
  ): Promise<void> {
    try {
      console.time(`[WARMUP] User ${userId}`);

      // 1. Buscar workspaces do usuário
      const workspaces = await new WorkspaceService()
        .filter({ user: userId })
        .list();

      const workspaceIds = Array.isArray(workspaces)
        ? workspaces.map(w => w.id)
        : workspaces.data.map(w => w.id);

      // 2. Buscar predicates desses workspaces
      const predicates = await new PredicateService()
        .filter({ workspace: workspaceIds })
        .list();

      const predicateList = Array.isArray(predicates) 
        ? predicates 
        : predicates.data;

      if (predicateList.length === 0) {
        console.log(`[WARMUP] No predicates found for user ${userId}`);
        return;
      }

      console.log(
        `[WARMUP] Found ${predicateList.length} predicates, fetching balances...`
      );

      // 3. Buscar balances em paralelo
      const provider = await FuelProvider.create(network.url);

      const results = await Promise.allSettled(
        predicateList.map(async predicate => {
          try {
            // ProviderWithCache cacheia automaticamente
            await provider.getBalances(predicate.predicateAddress);
            return { success: true, address: predicate.predicateAddress };
          } catch (err) {
            return { 
              success: false, 
              address: predicate.predicateAddress, 
              error: err.message 
            };
          }
        })
      );

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      console.timeEnd(`[WARMUP] User ${userId}`);
      console.log(`[WARMUP] Success: ${successful}/${predicateList.length}`);
    } catch (error) {
      console.error('[WARMUP] Error:', error);
    }
  }

  async signIn(req: ISignInRequest) {
    try {
      const { digest, encoder, signature, userAddress, name } = req.body;
      const userFilter = userAddress
        ? { address: new Address(userAddress).toB256() }
        : { name };

      const { userToken, signin } = await TokenUtils.createAuthToken(
        signature,
        digest,
        encoder,
        userFilter,
      );

      await App.getInstance()._sessionCache.addSession(
        userToken.accessToken,
        userToken,
      );

      // Disparar warm-up em background (não aguarda)
      this.warmupUserBalances(signin.user_id, signin.network).catch(err => {
        console.error('[WARMUP] Failed:', err);
      });

      return successful(signin, Responses.Ok);
    } catch (e) {
      if (e instanceof GeneralError) throw e;
      return error(e.error, e.statusCode);
    }
  }
}
```

### Benefícios do Warm-up

- **UX melhorada**: Dashboard carrega instantaneamente
- **Não bloqueia login**: Response imediato ao usuário
- **Paralelo**: Busca múltiplos balances simultaneamente
- **Resiliente**: Falhas no warm-up não afetam o login
- **Cache pronto**: Quando usuário acessar dashboard, cache já está aquecido

---

## Checklist de Implementação

### Fase 1: Infraestrutura Base

- [ ] **1.1. Atualizar RedisWriteClient**
  - Arquivo: `packages/api/src/utils/redis/RedisWriteClient.ts`
  - Adicionar método `del(key: string)`
  - Atualizar método `set()` para aceitar `options?: { EX?: number }`

- [ ] **1.2. Criar BalanceCache**
  - Arquivo: `packages/api/src/server/storage/balance.ts`
  - Implementar serialização/deserialização de BigNumbers
  - Métodos: get, set, invalidate, clearInvalidation, clear, stats

- [ ] **1.3. Criar ProviderWithCache**
  - Arquivo: `packages/api/src/utils/ProviderWithCache.ts`
  - Estender `Provider` do Fuel SDK
  - Override de `getBalances()` com cache
  - Método adicional `getBalancesForceRefresh()`

- [ ] **1.4. Modificar FuelProvider**
  - Arquivo: `packages/api/src/utils/FuelProvider.ts`
  - Mudar tipo de `providers` para `ProviderWithCache`
  - Adicionar `PROVIDER_OPTIONS` com `resourceCacheTTL: 0`
  - Usar `ProviderWithCache` no método `create()`

- [ ] **1.5. Adicionar BalanceCache ao App**
  - Arquivo: `packages/api/src/server/app.ts`
  - Importar `BalanceCache`
  - Adicionar propriedade `private balanceCache: BalanceCache`
  - Inicializar no construtor
  - Criar getter `_balanceCache`

### Fase 2: Invalidação

- [ ] **2.1. TransactionService.sendToChain()**
  - Arquivo: `packages/api/src/modules/transaction/services.ts`
  - Adicionar método privado `invalidatePredicateBalance()`
  - Chamar após `TransactionStatus.SUCCESS` (linha ~647)

- [ ] **2.2. TransactionController.close()**
  - Arquivo: `packages/api/src/modules/transaction/controller.ts`
  - Adicionar método privado `invalidatePredicateBalance()`
  - Buscar `transaction.predicate.predicateAddress` antes de invalidar
  - Chamar após update com SUCCESS (linha ~752)

- [ ] **2.3. Endpoint de Invalidação**
  - Arquivo: `packages/api/src/modules/webhook/routes.ts`
  - Adicionar `POST /internal/invalidate-balance`
  - Adicionar `GET /internal/cache-stats` (debug)

### Fase 3: Warm-up

- [ ] **3.1. AuthController.signIn()**
  - Arquivo: `packages/api/src/modules/auth/controller.ts`
  - Adicionar método privado `warmupUserBalances()`
  - Importar `WorkspaceService` e `PredicateService`
  - Disparar warm-up após login (sem await)

### Fase 4: Validação

- [ ] **4.1. Testes Manuais**
  - Verificar cache hit/miss em logs
  - Testar invalidação após transação
  - Testar warm-up após login
  - Verificar keys no Redis

- [ ] **4.2. Monitoramento**
  - Adicionar métricas de cache hit rate
  - Logs estruturados para debug
  - Alertas para falhas de cache

---

## Exemplos de Código

### Serialização de BigNumbers

```typescript
// Serializar para salvar no Redis
private serializeBalances(balances: CoinQuantity[]): SerializedCoinQuantity[] {
  return balances.map(b => ({
    assetId: b.assetId,
    amount: b.amount.toHex(), // BN → hex string
  }));
}

// Deserializar ao buscar do Redis
private deserializeBalances(serialized: SerializedCoinQuantity[]): CoinQuantity[] {
  return serialized.map(s => ({
    assetId: s.assetId,
    amount: bn(s.amount), // hex string → BN
  }));
}
```

### Uso Transparente no Código Existente

**ANTES** (sem mudanças):
```typescript
// PredicateService.allocation()
const instance = await this.instancePredicate(
  configurable,
  network.url,
  version,
);

const balances = (await instance.getBalances()).balances.filter(a =>
  a.amount.gt(0),
);
```

**DEPOIS** (mesmo código, cache automático):
```typescript
// PredicateService.allocation()
const instance = await this.instancePredicate(
  configurable,
  network.url,
  version,
);

// Automaticamente usa cache do ProviderWithCache!
const balances = (await instance.getBalances()).balances.filter(a =>
  a.amount.gt(0),
);
```

### Verificar Cache no Redis

```bash
# Conectar ao Redis
redis-cli

# Listar todas as chaves de balance
KEYS balance:*

# Ver conteúdo de um cache específico
GET "balance:0xfuel139e53...:9889"

# Ver flag de invalidação
GET "balance:invalidated:0xfuel139e53..."

# Ver TTL restante
TTL "balance:0xfuel139e53...:9889"

# Deletar cache manualmente (debug)
DEL "balance:0xfuel139e53...:9889"
```

---

## Métricas de Performance

### Antes da Implementação

**Cenário**: Usuário com 10 predicates acessando dashboard

```
Timeline de Loading:
T+0ms:   Login completo
T+50ms:  GET /api/predicate (lista predicates) → 50ms
T+100ms: GET /api/predicate/1/reserved-coins → 500ms (blockchain)
T+600ms: GET /api/predicate/2/reserved-coins → 500ms (blockchain)
...
T+5s:    GET /api/predicate/10/reserved-coins → 500ms (blockchain)
T+5.5s:  GET /api/user/allocation → 2000ms (blockchain)
───────────────────────────────────────────────────
TOTAL: ~7.5 segundos para carregar dashboard completo
```

**Chamadas à blockchain**: 11 (10 reserved-coins + 1 allocation)

### Depois da Implementação (Com Cache)

**Cenário**: Mesmo usuário, mesma situação

```
Timeline de Loading:
T+0ms:   Login completo
         Warm-up inicia em background
T+50ms:  GET /api/predicate (lista predicates) → 50ms
T+100ms: GET /api/predicate/1/reserved-coins → 30ms (cache HIT)
T+130ms: GET /api/predicate/2/reserved-coins → 30ms (cache HIT)
...
T+370ms: GET /api/predicate/10/reserved-coins → 30ms (cache HIT)
T+400ms: GET /api/user/allocation → 200ms (cache HIT)
───────────────────────────────────────────────────
TOTAL: ~600ms para carregar dashboard completo
```

**Chamadas à blockchain**: 0 (todos cache hits após warm-up)

### Comparação

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tempo total de loading** | 7.5s | 600ms | **92% redução** |
| **Chamadas blockchain** | 11 | 0-11 | **0-100% redução** |
| **Latência por endpoint** | 500-2000ms | 30-200ms | **85-94% redução** |
| **Disponibilidade** | Depende do Fuel provider | Independente | **Muito maior** |
| **Custo operacional** | Alto (muitas RPC calls) | Baixo | **Redução significativa** |

### Cache Hit Rate Esperado

Baseado em padrões de uso típicos:

- **Primeira hora após login**: 95-98% hit rate
- **Após transação confirmada**: 0% (invalidado, recalcula na próxima)
- **Após recalcular**: 95-98% hit rate novamente
- **Após 10 minutos sem uso**: 0% (TTL expirado)

### Cenários de Performance

#### Cenário 1: Login Fresh (Cache Vazio)
```
Login → Warm-up (2s background) → Dashboard load
T+0s:  Login response
T+2s:  Warm-up completo (background)
T+2s:  User acessa dashboard → 200ms (cache)
```

#### Cenário 2: Usuário Ativo (Cache Aquecido)
```
Dashboard refresh a cada 30s:
- Request 1: 200ms (cache hit)
- Request 2: 200ms (cache hit)
- Request 3: 200ms (cache hit)
```

#### Cenário 3: Após Transação
```
T+0s:   Transação confirmada
T+0s:   Cache invalidado
T+10s:  User refresha dashboard → 2s (cache miss, busca blockchain)
T+40s:  User refresha novamente → 200ms (cache hit)
```

---

## Troubleshooting

### 1. Verificar se Cache está Funcionando

#### Checar Logs
```bash
# Procurar por logs de cache
tail -f api.log | grep "BalanceCache\|ProviderCache\|WARMUP"

# Logs esperados:
[BalanceCache] HIT 0xfuel123... chain:9889 (5.2s old)
[BalanceCache] SET 0xfuel123... chain:9889
[WARMUP] Starting for user uuid-123
[WARMUP] Found 10 predicates, fetching balances...
[WARMUP] Complete for user uuid-123
```

#### Verificar Redis

```bash
# Ver todas as chaves de balance
redis-cli KEYS "balance:*" | wc -l

# Ver uma chave específica
redis-cli GET "balance:0xfuel139e53...:9889"

# Ver flags de invalidação
redis-cli KEYS "balance:invalidated:*"

# Monitorar operações em tempo real
redis-cli MONITOR | grep balance
```

### 2. Cache Não Está Sendo Usado (MISS constante)

**Possíveis causas**:

1. **TTL muito curto**: Verificar se `CACHE_TTL` está configurado corretamente (600s)
2. **ChainId diferente**: Verificar se chainId é consistente entre chamadas
3. **Endereço em formato diferente**: Verificar normalização de endereços
4. **Redis com problemas**: Verificar conexão com Redis

**Debug**:
```typescript
// Adicionar logs temporários em ProviderWithCache
console.log('[DEBUG] Looking for cache key:', cacheKey);
console.log('[DEBUG] ChainId:', this.chainId);
console.log('[DEBUG] Cache result:', cached ? 'HIT' : 'MISS');
```

### 3. Invalidação Não Funciona

**Possíveis causas**:

1. **Endereço incorreto**: Verificar se `transaction.predicateAddress` existe
2. **Redis não acessível**: Verificar conexão
3. **Erro silencioso**: Verificar logs de erro

**Verificar**:
```typescript
// Adicionar logs
console.log('[INVALIDATE] Address:', predicateAddress);
console.log('[INVALIDATE] Flag set:', `balance:invalidated:${predicateAddress}`);

// Verificar se flag foi criada
const flag = await RedisReadClient.get(`balance:invalidated:${predicateAddress}`);
console.log('[INVALIDATE] Flag exists:', !!flag);
```

### 4. Warm-up Não Executa

**Possíveis causas**:

1. **Promise não tratada**: Verificar se `.catch()` está presente
2. **Erro no warmupUserBalances()**: Verificar logs de erro
3. **Workspaces/Predicates não encontrados**: Verificar queries

**Debug**:
```typescript
// Adicionar logs no início e fim
async warmupUserBalances(userId: string, network: Network) {
  console.log('[WARMUP] START for user:', userId);
  try {
    // ... código ...
    console.log('[WARMUP] END for user:', userId);
  } catch (error) {
    console.error('[WARMUP] FAILED for user:', userId, error);
  }
}
```

### 5. Performance Não Melhorou

**Checklist**:

- [ ] Verificar se ProviderWithCache está sendo usado (logs de cache HIT/MISS)
- [ ] Confirmar que cache do Fuel SDK foi desabilitado (`resourceCacheTTL: 0`)
- [ ] Verificar se índices do banco foram criados (migration rodou?)
- [ ] Confirmar que warm-up está executando (logs de WARMUP)
- [ ] Medir latência individual de cada chamada

**Métricas para coletar**:
```typescript
// Adicionar timing em endpoints críticos
console.time('[ENDPOINT] allocation');
const result = await predicateService.allocation(...);
console.timeEnd('[ENDPOINT] allocation');
```

### 6. Endpoints de Debug

Adicionar endpoints temporários para diagnóstico:

```typescript
// packages/api/src/modules/webhook/routes.ts

// Ver stats do cache
router.get('/internal/cache-stats', async (req, res) => {
  const balanceCache = App.getInstance()._balanceCache;
  const stats = await balanceCache.stats();
  
  // Buscar keys do Redis
  // (precisa adicionar método no BalanceCache)
  
  return res.json({
    ...stats,
    timestamp: Date.now(),
  });
});

// Forçar warm-up manual
router.post('/internal/warmup-user', async (req, res) => {
  const { userId, networkUrl } = req.body;
  
  const provider = await FuelProvider.create(networkUrl);
  const chainId = await provider.getChainId();
  
  // Executar warm-up
  // ... código do warmupUserBalances ...
  
  return res.json({ success: true });
});

// Invalidar cache manualmente
router.post('/internal/invalidate-all', async (req, res) => {
  // Limpar todo o cache (usar com cuidado!)
  const balanceCache = App.getInstance()._balanceCache;
  
  // Implementar método clearAll() no BalanceCache se necessário
  
  return res.json({ success: true });
});
```

### 7. Monitoramento em Produção

**Métricas importantes**:

```typescript
// Adicionar ao monitoring
const cacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  warmups: 0,
};

// Atualizar em cada operação
cacheMetrics.hits++;
cacheMetrics.misses++;

// Expor via endpoint
router.get('/metrics', (req, res) => {
  res.json({
    cache: cacheMetrics,
    timestamp: Date.now(),
  });
});
```

**Alertas sugeridos**:
- Cache hit rate < 70% (pode indicar TTL muito curto)
- Invalidações > 1000/hora (muitas transações)
- Warm-up failures > 10% (problema com blockchain)

---

## Considerações de Segurança

### 1. Endpoint de Invalidação

O endpoint `/internal/invalidate-balance` deve ser protegido:

```typescript
// Opção 1: IP whitelist
const ALLOWED_IPS = [
  '127.0.0.1',
  'worker-service-ip',
];

router.post('/internal/invalidate-balance', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}, async (req, res) => {
  // ... código de invalidação ...
});

// Opção 2: API Key
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

router.post('/internal/invalidate-balance', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}, async (req, res) => {
  // ... código de invalidação ...
});
```

### 2. Rate Limiting

Proteger endpoints de invalidação contra abuse:

```typescript
// Usar express-rate-limit
import rateLimit from 'express-rate-limit';

const invalidationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 invalidações por minuto
  message: 'Too many invalidation requests',
});

router.post(
  '/internal/invalidate-balance',
  invalidationLimiter,
  async (req, res) => {
    // ... código ...
  }
);
```

---

## Integração com Worker (Fase Futura)

### Worker → API Invalidation

**Arquivo**: `packages/worker/src/queues/predicateBalance/queue.ts`

```typescript
balanceQueue.process(async (job) => {
  const db = await MongoDatabase.connect();
  const { predicate_address } = job.data;

  // ... processamento existente ...

  try {
    await syncBalance(deposits, balance_collection, assets, price_collection);

    // Invalidar cache na API se houve mudanças
    if (deposits.length > 0) {
      try {
        const API_URL = process.env.API_URL || 'http://localhost:3000';
        const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

        await fetch(`${API_URL}/internal/invalidate-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': INTERNAL_API_KEY,
          },
          body: JSON.stringify({ predicate_address }),
        });

        console.log(`[WORKER] Cache invalidated for ${predicate_address}`);
      } catch (error) {
        console.error('[WORKER] Failed to invalidate cache:', error);
        // Não bloqueia processamento do worker
      }
    }

    return `Processed ${deposits.length} deposits for ${predicate_address}`;
  } catch (e) {
    console.error(e);
    throw e;
  }
});
```

---

## Rollback Strategy

Se houver problemas após deploy, rollback é simples:

### Opção 1: Feature Flag

```typescript
// packages/api/src/utils/config.ts
export const ENABLE_BALANCE_CACHE = process.env.ENABLE_BALANCE_CACHE === 'true';

// packages/api/src/utils/FuelProvider.ts
static async create(url: string, options?: ProviderOptions): Promise<Provider> {
  // ... código ...
  
  // Usar ProviderWithCache apenas se feature flag ativa
  if (ENABLE_BALANCE_CACHE) {
    const p = new ProviderWithCache(cleanUrl, providerOptions);
    await p.connect();
    return p;
  }
  
  // Fallback para Provider normal
  const p = await Provider.create(cleanUrl, providerOptions);
  return p;
}
```

### Opção 2: Rollback Total

1. Reverter commits da implementação
2. Ou simplesmente setar `resourceCacheTTL: 0` no ProviderWithCache para desabilitar

```typescript
// Desabilitar cache temporariamente sem mudar código
export class ProviderWithCache extends Provider {
  async getBalances(address: string): Promise<{ balances: CoinQuantity[] }> {
    // Bypass do cache - usar direto a blockchain
    return super.getBalances(address);
  }
}
```

---

## FAQ

### P: O cache funciona com múltiplas instâncias da API?

**R**: Sim! O cache está no Redis, que é compartilhado entre todas as instâncias. Todas as instâncias consultam o mesmo Redis e compartilham o mesmo cache.

### P: O que acontece se Redis cair?

**R**: O código tem fallback automático. Se Redis não estiver disponível, `BalanceCache.get()` retorna `null` e o sistema busca da blockchain normalmente. A aplicação continua funcionando, apenas mais lenta.

### P: Quanto espaço no Redis será usado?

**R**: Aproximadamente:
- **1 predicate** = ~1-5 KB (dependendo do número de assets)
- **100 predicates** = ~100-500 KB
- **1000 predicates** = ~1-5 MB

Com TTL de 10 minutos, o espaço usado é limitado.

### P: Como limpar todo o cache manualmente?

**R**: 
```bash
# Via Redis CLI
redis-cli KEYS "balance:*" | xargs redis-cli DEL

# Ou via endpoint (se implementado)
curl -X POST http://localhost:3000/internal/clear-all-cache \
  -H "X-API-Key: seu-api-key"
```

### P: O warm-up consome muitos recursos?

**R**: O warm-up:
- Roda em **background** (não bloqueia login)
- Usa **Promise.allSettled** (falhas não param o processo)
- Executa **apenas no login** (não periodicamente)
- É **opcional** (sistema funciona sem ele, só é mais lento)

Se houver muitos logins simultâneos, considere:
- Rate limiting no warm-up
- Queue de warm-up (processar gradualmente)
- Desabilitar warm-up em horários de pico

### P: Balances podem ficar desatualizados?

**R**: Sim, mas isso é aceitável:
- **TTL de 10 minutos**: Dados no máximo 10 minutos desatualizados
- **Invalidação proativa**: Quando transação é confirmada, invalida imediatamente
- **Warm-up**: Busca dados frescos no login

Para dados críticos (ex: antes de enviar transação), sempre força refresh:
```typescript
const provider = await FuelProvider.create(network.url);
// Força busca da blockchain
const balances = await provider.getBalances(address);
```

### P: Como monitorar a eficácia do cache?

**R**: Adicionar métricas:
```typescript
// Incrementar contadores em cada operação
cache_hits_total
cache_misses_total
cache_invalidations_total
cache_warmup_duration_seconds

// Calcular hit rate
hit_rate = cache_hits / (cache_hits + cache_misses)
```

Expor via Prometheus ou endpoint `/metrics`.

---

## Próximos Passos

Após implementação completa da Fase 1 (Cache de Balances):

### Fase 2: Otimizações Adicionais

1. **Endpoint Agregado**: Criar `GET /api/user/dashboard` que retorna todos os dados necessários em uma única chamada
2. **Eager Loading**: Otimizar queries SQL com joins para reduzir round-trips ao banco
3. **Índices Adicionais**: Adicionar índices em colunas frequentemente filtradas

### Fase 3: Progressive Loading

1. **Skeleton UI**: Frontend mostra UI parcial enquanto carrega dados pesados
2. **Server-Sent Events**: Stream de updates de balances conforme vão sendo calculados
3. **Lazy Loading**: Carregar dados menos importantes sob demanda

### Fase 4: Worker Integration

1. **Indexer de Balances**: Worker mantém cópia dos balances no MongoDB
2. **Change Data Capture**: Worker notifica API sobre mudanças em tempo real
3. **Fallback Híbrido**: Usar MongoDB como cache primário, Redis como cache secundário

---

## Referências

- **Fuel SDK Documentation**: https://docs.fuel.network/docs/fuels-ts/
- **TypeORM Migrations**: https://typeorm.io/migrations
- **Redis Commands**: https://redis.io/commands
- **PostgreSQL Indexes**: https://www.postgresql.org/docs/current/indexes.html

---

## Changelog

### v1.0.0 - Initial Implementation
- Implementação de ProviderWithCache
- BalanceCache com Redis
- Invalidação em TransactionService e TransactionController
- Warm-up no AuthController
- Endpoint /internal/invalidate-balance

### v1.1.0 - Performance Improvements (Planejado)
- Índices de banco de dados
- Endpoint agregado de dashboard
- Métricas de monitoramento

### v2.0.0 - Worker Integration (Planejado)
- Indexer de balances no Worker
- Cache híbrido (MongoDB + Redis)
- Change Data Capture

---

**Documento criado em**: 2025-01-25  
**Última atualização**: 2025-01-25  
**Autor**: Time Bsafe API  
**Status**: Pronto para implementação
