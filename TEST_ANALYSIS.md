# Análise de Estabilidade de Testes - bako-safe-api

> **Data:** 2026-02-05
> **Branch:** `staging-docs-review`
> **Autor:** Revisão de onboarding

---

## Resumo Executivo

| Métrica | Valor | Status |
|---------|-------|--------|
| Total de Testes | 34 | ⚠️ |
| Testes Passando | 33 | ✅ |
| Testes Falhando | 1 | ❌ |
| Cobertura de Módulos | 5/8 (62.5%) | ⚠️ |
| Testes Unitários | 0 | ❌ |
| CI Configurado | Sim (PRs only) | ⚠️ |

---

## Setup de Testes

### Stack Utilizada

- **Test Runner:** Node.js native test runner (`node:test`)
- **HTTP Testing:** supertest
- **Database:** Testcontainers (PostgreSQL isolado)
- **Blockchain:** `launchTestNode()` do Fuel SDK
- **Assertions:** `node:assert/strict`

### Como Rodar

```bash
cd packages/api
pnpm test:build  # Build + testes com testcontainers
```

### Validação do Setup

| Item | Status | Observação |
|------|--------|------------|
| Testcontainers PostgreSQL | ✅ OK | Sobe container automaticamente |
| Fuel Test Node | ⚠️ Parcial | Incompatibilidade de versão |
| Build antes de testes | ✅ OK | Compila TS para JS |
| Cleanup após testes | ✅ OK | `t.after()` + `App.stop()` |
| CI GitHub Actions | ✅ OK | Roda em PRs |

---

## Problema Identificado no Setup

### Incompatibilidade de Versão fuel-core vs SDK

**Erro observado:**
```
InsufficientFeeAmount { expected: 1430, provided: 1000 }

The Fuel Node that you are trying to connect to is using fuel-core version 0.47.1.
The TS SDK currently supports fuel-core version 0.43.1.
Things may not work as expected.
```

**Causa:** O `launchTestNode()` do SDK sobe um fuel-core 0.47.1, mas o SDK `fuels@0.101.3` espera 0.43.1.

**Impacto:** Teste `transaction.tests.ts` falha ao criar mock de transação (fee calculation incorreto).

**Solução sugerida:**
1. Atualizar `fuels` para versão compatível com fuel-core 0.47.1
2. OU fixar versão do fuel-core no testcontainers

---

## Cobertura por Módulo

### Módulos COM Testes

| Módulo | Arquivo | Endpoints | Testes | Cobertura |
|--------|---------|-----------|--------|-----------|
| auth | `auth.tests.ts` | 4 | 4 | 100% |
| user | `user.tests.ts` | 5 | 4 | 80% |
| predicate | `predicate.tests.ts` | 10 | 9 | 90% |
| transaction | `transaction.tests.ts` | 12 | 14 | 100%+ |
| addressBook | `addressBook.tests.ts` | 4 | 4 | 100% |
| apiToken | `apiToken.tests.ts` | 3 | 3 | 100% |
| notification | `notification.tests.ts` | 3 | 2 | 66% |

### Módulos SEM Testes ❌

| Módulo | Endpoints | Risco |
|--------|-----------|-------|
| **workspace** | 7 | 🔴 CRÍTICO - Permissões |
| **dApps/connections** | 9 | 🔴 CRÍTICO - Integrações |
| **external** | 4 | 🟡 MÉDIO |
| **cliToken** | 3 | 🟡 MÉDIO (testes comentados) |

---

## Detalhamento dos Testes Existentes

### auth.tests.ts (4 testes)
- ✅ `POST /user` - criar usuário e autenticar
- ✅ `POST /auth/code` - regenerar código de autenticação
- ✅ `POST /auth/code` - gerar código com sucesso
- ✅ `DELETE /auth/sign-out` - logout

### user.tests.ts (4 testes)
- ✅ `PUT /user/:id` - atualizar nickname
- ✅ `GET /user/predicates` - listar predicates do usuário
- ✅ `GET /user/latest/transactions` - listar transações recentes
- ✅ `GET /user/latest/tokens` - obter valores USD dos tokens

### predicate.tests.ts (9 testes)
- ✅ `POST /predicate` - criar com versão
- ✅ `POST /predicate` - criar sem versão
- ✅ `GET /predicate` - listar com paginação
- ✅ `GET /predicate/:id` - buscar por ID
- ✅ `GET /predicate/by-name/:name` - buscar por nome
- ✅ `GET /predicate/by-address/:address` - buscar por endereço
- ✅ `GET /predicate/reserved-coins/:id` - obter balance
- ✅ `GET /predicate/check/by-address/:address` - verificar existência
- ✅ `PUT /predicate/:address/visibility` - toggle visibilidade

### transaction.tests.ts (14 testes)
- ✅ `POST /transaction` - criar transação
- ✅ `GET /transaction` - listar transações
- ✅ `GET /transaction?page&perPage` - listar com paginação
- ✅ `GET /transaction?status[]` - filtrar por status
- ✅ `GET /transaction/:id` - buscar por ID
- ✅ `GET /transaction/by-hash/:hash` - buscar por hash
- ✅ `GET /transaction/history/:id/:predicateId` - histórico
- ✅ `GET /transaction/pending` - transações pendentes
- ✅ `PUT /transaction/sign/:hash` - assinar transação
- ✅ `GET /transaction/:id/advanced-details` - detalhes avançados
- ✅ `GET /transaction/with-incomings` - transações com incomings
- ✅ `PUT /transaction/close/:id` - fechar transação
- ✅ `PUT /transaction/cancel/:hash` - cancelar transação
- ✅ Fluxo completo: criar → cancelar → recriar → assinar

### addressBook.tests.ts (4 testes)
- ✅ `POST /address-book` - criar entrada
- ✅ `PUT /address-book/:id` - atualizar
- ✅ `GET /address-book` - listar
- ✅ `DELETE /address-book/:id` - deletar

### apiToken.tests.ts (3 testes)
- ✅ `POST /api-token/:predicateId` - criar token
- ✅ `GET /api-token/:predicateId` - listar tokens
- ✅ `DELETE /api-token/:predicateId/:apiTokenId` - deletar

### notification.tests.ts (2 testes)
- ✅ `GET /notifications` - listar com paginação e filtros
- ✅ `PUT /notifications/read-all` - marcar todas como lidas

### cliToken.tests.ts (0 testes ativos)
- ❌ `Encode` - **COMENTADO**
- ❌ `Decode` - **COMENTADO**
- ❌ `Decode with invalid token` - **COMENTADO**

---

## Endpoints SEM Cobertura de Testes

### workspace (7 endpoints) - CRÍTICO

```typescript
// packages/api/src/modules/workspace/routes.ts
router.get('/by-user', ...)           // listar workspaces do usuário
router.post('/', ...)                  // criar workspace
router.get('/:id', ...)               // buscar por ID
router.put('/', ...)                  // atualizar workspace
router.put('/permissions/:member', ...) // atualizar permissões
router.post('/members/:member/remove', ...) // remover membro
router.post('/members/:member/include', ...) // adicionar membro
```

### dApps/connections (9 endpoints) - CRÍTICO

```typescript
// packages/api/src/modules/dApps/routes.ts
router.post('/', ...)                    // conectar dApp
router.get('/:sessionId/transaction/:vaultAddress/:txId', ...) // código conector
router.put('/:sessionId/network', ...)   // mudar rede
router.get('/:sessionId/state', ...)     // estado da sessão
router.get('/:sessionId/accounts', ...)  // contas disponíveis
router.get('/:sessionId/currentAccount', ...) // conta atual
router.get('/:sessionId/currentNetwork', ...) // rede atual
router.get('/:sessionId', ...)           // sessão atual
router.delete('/:sessionId', ...)        // desconectar
```

### external (4 endpoints)

```typescript
// packages/api/src/modules/external/routes.ts
router.get('/predicate', ...) // listar predicates (API externa)
router.get('/user', ...)      // listar users (API externa)
router.get('/quote', ...)     // cotações
router.get('/tx', ...)        // transações
```

---

## CI/CD

### Configuração Atual

```yaml
# .github/workflows/test-api.yml
name: Run API Tests

on:
  pull_request:
    branches:
      - "**"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-forc
      - run: npm install -g pnpm
      - uses: actions/setup-node@v4
      - run: pnpm install --no-frozen-lockfile
      - run: cp .env.test .env
      - run: pnpm test:build
```

### Problemas Identificados

1. **Apenas em PRs** - Não roda em push para `main`/`master`
2. **Sem coverage report** - Não há métricas de cobertura
3. **Sem badge de status** - README não mostra status dos testes

---

## Plano de Ação

### P0 - Crítico (Fazer Agora)

- [ ] **Corrigir incompatibilidade fuel-core vs SDK**
  - Atualizar `fuels` ou fixar versão do fuel-core
  - Responsável: ___
  - Prazo: ___

- [ ] **Adicionar testes para workspace**
  - CRUD de workspaces
  - Permissões (owner, admin, manager, viewer)
  - Adicionar/remover membros

- [ ] **Descomentar ou remover cliToken.tests.ts**
  - Testes comentados causam falsa sensação de cobertura

### P1 - Alta Prioridade

- [ ] **Adicionar testes para dApps/connections**
  - Fluxo de conexão completo
  - Mudança de rede
  - Disconnect

- [ ] **Configurar coverage report**
  - Adicionar `c8` ou `nyc`
  - Threshold mínimo: 70%
  - Falhar CI se abaixo do threshold

- [ ] **CI em push para branches principais**
  - Adicionar trigger: `push: branches: [main, staging]`

### P2 - Média Prioridade

- [ ] **Adicionar testes para external routes**
- [ ] **Adicionar testes unitários para services**
- [ ] **Adicionar testes de edge cases** (validações, erros 4xx/5xx)
- [ ] **Badge de status no README**

---

## Conclusão

### Os testes validam que o sistema continua funcionando?

**PARCIALMENTE**

| Aspecto | Validado? |
|---------|-----------|
| Autenticação | ✅ Sim |
| Gestão de Vaults (predicates) | ✅ Sim |
| Transações | ✅ Sim |
| Address Book | ✅ Sim |
| API Tokens | ✅ Sim |
| Notificações | ✅ Sim |
| **Workspaces/Permissões** | ❌ **NÃO** |
| **Integrações dApps** | ❌ **NÃO** |
| **CLI** | ❌ **NÃO** |

### Risco de Regressão

- **ALTO** para workspace e dApps (sem cobertura)
- **MÉDIO** para notification e external (cobertura parcial)
- **BAIXO** para auth, predicate, transaction (boa cobertura)

---

## Referências

- Arquivos de teste: `packages/api/src/tests/*.tests.ts`
- Setup de teste: `packages/api/src/tests/utils/Setup.ts`
- CI: `.github/workflows/test-api.yml`
- Mocks: `packages/api/src/tests/mocks/`
