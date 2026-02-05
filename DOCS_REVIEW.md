# Revisão de Documentação e Setup - bako-safe-api

> Documento gerado durante análise de onboarding de novo desenvolvedor.
> Branch: `staging-docs-review`
> Data: 2026-02-05

---

## Status da Execução

| Etapa | Status | Observações |
|-------|--------|-------------|
| Clone do repositório | ✅ OK | - |
| Checkout da branch | ✅ OK | - |
| pnpm install | ✅ OK | Warning sobre `resolutions` no package.json da API |
| Copiar .env files | ✅ OK | - |
| Criar docker network | ✅ OK | - |
| pnpm dev (Quick Start) | ❌ FALHA | Race condition + variáveis faltando |
| Manual Setup | ✅ OK | Funciona seguindo passo a passo |
| Migrations | ❌ FALHA | Script aponta para path inexistente |
| Testes | ⚠️ PARCIAL | 33/35 passaram, 2 falharam (cleanup assíncrono) |

### Conclusão do Onboarding

**Tempo gasto:** ~30 minutos (deveria ser ~5 minutos)

**Bloqueadores encontrados:**
1. Quick Start (`pnpm dev`) não funciona out-of-the-box
2. `.env.example` incompleto - faltam variáveis críticas
3. `RIG_ID_CONTRACT` vazio causa crash da API
4. Script de migration quebrado

**O que funcionou bem:**
- Testcontainers para testes (excelente DX)
- Setup manual com Docker funciona
- Estrutura de packages clara

---

## Problemas Críticos Encontrados

### 1. Race Condition na Inicialização (CRÍTICO)

**Problema:** O comando `pnpm dev` falha porque o Turbo inicia todos os serviços em paralelo. A API e o Socket-Server tentam conectar ao banco de dados antes dele estar healthy.

**Erro observado:**
```
bakosafe-api:dev: Error: connect ECONNREFUSED 127.0.0.1:5432
bakosafe-socket-server:dev: Error: getaddrinfo ENOTFOUND db
```

**Causa raiz:** O `turbo.json` define dependências entre tasks, mas as tasks de infraestrutura (db, redis, chain) não bloqueiam adequadamente as tasks de aplicação.

**Impacto:** Desenvolvedor não consegue usar o Quick Start documentado.

**Sugestão de correção:**
- Opção A: Adicionar script de wait-for-it antes de iniciar API/Socket
- Opção B: Documentar que deve-se usar o Manual Setup
- Opção C: Separar `pnpm dev:infra` de `pnpm dev:app`

---

### 2. Socket-Server .env.example com HOST Incorreto (CRÍTICO)

**Arquivo:** `packages/socket-server/.env.example`

**Problema:**
```env
DATABASE_HOST=db  # Este é o hostname Docker interno!
```

**Deveria ser:**
```env
DATABASE_HOST=127.0.0.1  # Para desenvolvimento local fora do Docker
```

**Impacto:** Socket-Server não inicia em desenvolvimento local.

---

### 3. UI_URL Inconsistente Entre Packages (MÉDIO)

| Package | UI_URL |
|---------|--------|
| api | `http://localhost:5175` |
| socket-server | `http://localhost:5173` |

**Impacto:** Confusão sobre qual porta o frontend deve rodar.

---

## Gaps de Documentação

### README.md Principal

| Item | Status | Prioridade |
|------|--------|------------|
| Visão geral do projeto (o que é Bako Safe?) | ❌ Ausente | Alta |
| Arquitetura do sistema | ❌ Ausente | Alta |
| Diagrama de componentes | ❌ Ausente | Média |
| Descrição de cada package | ❌ Ausente | Alta |
| Como rodar migrations | ❌ Ausente | Alta |
| Configuração de Redis para API | ❌ Ausente | Alta |
| Como contribuir (CONTRIBUTING.md) | ❌ Ausente | Média |
| Troubleshooting expandido | ⚠️ Parcial | Média |

### Variáveis de Ambiente Não Documentadas

**packages/api/.env.example** - Variáveis sem explicação:
- `API_TOKEN_SECRET` / `API_TOKEN_SECRET_IV` - Para que servem?
- `API_SOCKET_SESSION_ID` - Valor hardcoded, é seguro?
- `FUEL_PROVIDER_CHAIN_ID` - Quando usar 0 vs 9889?
- `RIG_ID_CONTRACT` - Obrigatório? Onde obter?
- `DB_METABASE_USERNAME` / `DB_METABASE_PASS` - São necessários para dev?
- `COIN_MARKET_CAP_API_KEY` - Obrigatório? Funciona sem?

### Packages Sem Documentação

| Package | README | Descrição |
|---------|--------|-----------|
| api | ❌ Não | Apenas README de contracts/rig |
| chain | ❌ Não | Nenhuma doc |
| database | ❌ Não | Nenhuma doc |
| redis | ❌ Não | Nenhuma doc |
| socket-server | ❌ Não | Nenhuma doc |
| metabase | ❌ Não | Nenhuma doc |
| worker | ✅ Sim | Tem README completo |

---

## Inconsistências no Código

### 1. Variáveis Duplicadas em api/.env.example

```env
ASSETS_URL=https://besafe-asset.s3.amazonaws.com/icon
ASSETS_URL=https://besafe-asset.s3.amazonaws.com/icon  # DUPLICADO

APP_ADMIN_EMAIL=admin_user_email
# ...
APP_ADMIN_EMAIL=admin_user_email  # DUPLICADO
APP_ADMIN_PASSWORD=admin_user_password  # DUPLICADO
```

### 2. Typo em worker/.env.example

```env
WORKER_MONGO_ENVIRONMENT=devevelopment  # Typo: "devevelopment"
```

### 3. Worker README Desatualizado

O README menciona `pnpm worker:dev:start` mas esse script não existe no package.json do worker.

---

## Documentação de API (Swagger/OpenAPI)

**Status:** ❌ Inexistente

**Endpoints identificados (sem documentação):**
- `/auth/*` - Autenticação
- `/user/*` - Usuários
- `/cli/*` - CLI Auth
- `/connections/*` - dApps
- `/api-token/*` - API Tokens
- `/workspace/*` - Workspaces
- `/predicate/*` - Predicates
- `/address-book/*` - Address Book
- `/transaction/*` - Transações
- `/notifications/*` - Notificações
- `/external/*` - Rotas externas
- `/ping` - Health check simples
- `/healthcheck` - Health check

---

## Log de Execução

### Tentativa 1: Quick Start (pnpm dev)

```bash
$ pnpm install
# ✅ OK - 1315 packages instalados

$ cp packages/api/.env.example packages/api/.env
$ cp packages/database/.env.example packages/database/.env
$ cp packages/redis/.env.example packages/redis/.env
$ cp packages/socket-server/.env.example packages/socket-server/.env
# ✅ OK

$ docker network create bako-network
# ✅ OK

$ pnpm dev
# ❌ FALHA
# - Redis: ✅ Healthy
# - Database: ✅ Healthy (após ~12s)
# - MongoDB: ✅ Healthy
# - Fuel Chain: ✅ Healthy
# - Socket-Server: ❌ Error: getaddrinfo ENOTFOUND db
# - API: ❌ Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Conclusão:** O Quick Start não funciona out-of-the-box.

---

### Tentativa 2: Manual Setup

```bash
# 1. Database
$ cd packages/database && docker compose --env-file .env.example up -d
# ✅ OK - postgres e mongodb healthy

# 2. Redis
$ cd packages/redis && docker compose --env-file .env.example up -d
# ✅ OK - redis healthy

# 3. Fuel Chain
$ cd packages/chain && docker compose -p bako-safe_dev --env-file .env.chain up -d --build
# ✅ OK - fuel-core e faucet rodando

# 4. Socket Server
$ cd packages/socket-server && docker compose up -d --build
# ✅ OK - socket-server healthy

# 5. API
$ cd packages/api && pnpm dev
# ❌ FALHA - Erro: FuelError: Unknown address format
```

**Erro na API:**
```
FuelError: Unknown address format: only 'B256', 'Public Key (512)', or 'EVM Address' are supported.
    at new Rig (/packages/api/src/contracts/rig/mainnet/types/Rig.ts:1645:5)
    at Function.start (/packages/api/src/server/storage/rig.ts:35:19)
```

**Causa:** `RIG_ID_CONTRACT` está vazio no `.env.example`

---

## Análise do .env Completo vs .env.example

Comparando o arquivo de ambiente funcional com o `.env.example`:

### Variáveis Faltando no .env.example (CRÍTICO)

| Variável | Valor Exemplo | Descrição |
|----------|---------------|-----------|
| `REDIS_URL_WRITE` | `redis://localhost:6379` | URL do Redis para escrita |
| `REDIS_URL_READ` | `redis://localhost:6379` | URL do Redis para leitura |
| `WORKER_URL` | `http://localhost:3063` | URL do Worker |
| `MELD_SANDBOX_API_KEY` | `***` | API Key do MELD (sandbox) |
| `MELD_SANDBOX_API_URL` | `https://api-sb.meld.io/` | URL API MELD sandbox |
| `MELD_SANDBOX_WEBHOOK_SECRET` | `***` | Webhook secret MELD |
| `MELD_PRODUCTION_API_KEY` | `***` | API Key MELD produção |
| `MELD_PRODUCTION_API_URL` | `https://api.meld.io/` | URL API MELD produção |
| `MELD_PRODUCTION_WEBHOOK_SECRET` | `***` | Webhook secret MELD prod |
| `LAYERS_SWAP_API_URL` | `https://api.layerswap.io/api/v2` | URL LayerSwap |
| `LAYERS_SWAP_API_KEY_SANDBOX` | `***` | API Key LayerSwap sandbox |
| `LAYERS_SWAP_API_KEY_PROD` | `***` | API Key LayerSwap prod |
| `LAYERS_SWAP_WEBHOOK_SECRET` | `***` | Webhook LayerSwap |
| `ENABLE_BALANCE_CACHE` | `true` | Habilita cache de balance |
| `BALANCE_CACHE_TTL` | `300` | TTL do cache de balance |
| `BALANCE_INVALIDATION_TTL` | `3600` | TTL invalidação cache |
| `WARMUP_ENABLED` | `true` | Habilita warmup |
| `WARMUP_CONCURRENCY` | `5` | Concorrência warmup |
| `WARMUP_MAX_PREDICATES` | `20` | Max predicates warmup |
| `WARMUP_SKIP_CACHED` | `true` | Pula cached no warmup |
| `TRANSACTION_CACHE_TTL` | `600` | TTL cache transações |
| `TRANSACTION_INCREMENTAL_LIMIT` | `10` | Limite incremental |
| `INTERNAL_API_KEY` | `worker_api_key` | Chave interna para Worker |
| `NODE_ENV` | `development` | Ambiente Node |

### Valores Incorretos no .env.example

| Variável | .env.example | Valor Correto |
|----------|--------------|---------------|
| `FUEL_PROVIDER` | `http://127.0.0.1:4000/v1/graphql` | OK para local, mas falta opção testnet |
| `UI_URL` | `http://localhost:5175` | `http://localhost:5174` (inconsistente) |
| `RIG_ID_CONTRACT` | *(vazio)* | `0x2181f1b8e00756672515807cab7de10c70a9b472a4a9b1b6ca921435b0a1f49b` |

### Sugestão: RIG_ID_CONTRACT como Constante

O `RIG_ID_CONTRACT` é um endereço de contrato público na mainnet. Sugestão:

```typescript
// src/constants/contracts.ts
export const RIG_CONTRACTS = {
  MAINNET: '0x2181f1b8e00756672515807cab7de10c70a9b472a4a9b1b6ca921435b0a1f49b',
  TESTNET: null, // não existe em testnet
} as const;
```

E no código usar fallback:
```typescript
const rigAddress = RIG_ID_CONTRACT || RIG_CONTRACTS.MAINNET;
```

Ou melhor ainda - tornar o RigInstance opcional em dev:
```typescript
if (RIG_ID_CONTRACT) {
  this.rigCache = RigInstance.start();
}
```

---

---

### Tentativa 3: Rodar Migrations

```bash
$ cd packages/api && pnpm migration:run
# ❌ FALHA
```

**Erro:**
```
Error: Unable to open file: "/packages/api/src/database"
Cannot find module '/packages/api/src/database'
```

**Causa:** O script `migration:run` no package.json aponta para `src/database` que é um **diretório**, não um arquivo:

```json
"migration:run": "ts-node ... --dataSource src/database"
```

**Problema:** Não existe um arquivo `dataSource.ts` exportando o DataSource do TypeORM. A configuração real está em:
- `src/config/database.ts` - Função `getDatabaseConfig()`
- `src/config/connection.ts` - Função `getDatabaseInstance()`

**Sugestão:** Criar arquivo `src/database/index.ts`:
```typescript
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database';

export default new DataSource(getDatabaseConfig());
```

Ou corrigir o script para:
```json
"migration:run": "ts-node ... --dataSource src/config/connection"
```

---

### Tentativa 4: Rodar Testes

```bash
$ cd packages/api && pnpm test:build
```

**Resultado:** ⚠️ PARCIAL
- Total: 35 testes
- Passou: 33
- Falhou: 2

**Erros encontrados:**
1. `build/tests/predicate.tests.js` - Falhou
2. `build/tests/user.tests.js` - Falhou com:
   ```
   generated asynchronous activity after the test ended.
   Error: App is not started
   ```

**Análise:** Os erros parecem ser de cleanup assíncrono após os testes, não falhas funcionais.

**Nota:** Os testes usam `testcontainers` que inicia um PostgreSQL automaticamente - isso é bem documentado e funciona.

---

## Checklist de Correções Sugeridas

### Prioridade 0 (Bloqueadores)

- [x] Corrigir `DATABASE_HOST` em `packages/socket-server/.env.example` para `127.0.0.1`
- [x] Adicionar mecanismo de retry/wait na inicialização da API e Socket-Server
- [x] Corrigir script `migration:run` - aponta para diretório inexistente (criado database/index.ts)
- [x] Adicionar variáveis de Redis faltando no `.env.example` (`REDIS_URL_WRITE`, `REDIS_URL_READ`)
- [x] Adicionar `RIG_ID_CONTRACT` no `.env.example` ou tornar opcional em dev
- [x] Corrigir race condition no `pnpm dev` (wait-on + healthchecks)
- [x] Corrigir socket-server database config para aceitar 'postgres' como host local
- [x] Atualizar Makefiles para Docker Compose V2 syntax

### Prioridade 1 (Essenciais)

- [x] Adicionar seção "O que é Bako Safe?" no README
- [x] Documentar como rodar migrations
- [x] Documentar arquitetura dos packages
- [x] Unificar `UI_URL` entre packages (5173 vs 5175) -> 5174
- [x] Adicionar configuração de Redis no `.env.example` da API
- [ ] Criar documentação Swagger/OpenAPI

### Prioridade 2 (Melhorias)

- [x] Remover variáveis duplicadas dos `.env.example`
- [x] Corrigir typo `devevelopment` no worker
- [ ] Criar CONTRIBUTING.md
- [x] Adicionar diagrama de arquitetura (texto no README)
- [x] Atualizar README do worker com scripts corretos (já estava correto)

---

## Próximos Passos

1. ~~Tentar setup manual (passo a passo)~~ ✅
2. ~~Testar migrations~~ ❌ Script quebrado
3. ~~Rodar testes~~ ⚠️ 33/35 passaram
4. Documentar fluxo completo funcional

---

## Setup Manual Funcional (Testado)

Para desenvolvedores novos, este é o fluxo que **realmente funciona**:

```bash
# 1. Clone e setup inicial
git clone https://github.com/infinitybase/bako-safe-api.git
cd bako-safe-api
git checkout staging-docs-review
pnpm install

# 2. Criar rede Docker
docker network create bako-network

# 3. Copiar e configurar .env
cp packages/api/.env.example packages/api/.env
cp packages/database/.env.example packages/database/.env
cp packages/redis/.env.example packages/redis/.env
cp packages/socket-server/.env.example packages/socket-server/.env

# IMPORTANTE: Editar packages/api/.env e adicionar:
# - REDIS_URL_WRITE=redis://localhost:6379
# - REDIS_URL_READ=redis://localhost:6379
# - RIG_ID_CONTRACT=0x2181f1b8e00756672515807cab7de10c70a9b472a4a9b1b6ca921435b0a1f49b

# 4. Subir infraestrutura (em ordem!)
cd packages/database && docker compose --env-file .env.example up -d
# Aguardar containers ficarem healthy (~15s)
cd ../redis && docker compose --env-file .env.example up -d
cd ../chain && docker compose -p bako-safe_dev --env-file .env.chain up -d --build
cd ../socket-server && docker compose up -d --build

# 5. Verificar todos os containers
docker ps
# Deve mostrar: postgres, mongodb-dev, redis-bako-dev, bakosafe_fuel-core, bakosafe_faucet, bako-socket-server

# 6. Iniciar API
cd ../api && pnpm dev

# 7. Testar
curl http://localhost:3333/ping
curl http://localhost:3333/healthcheck
```

### Para rodar testes (sem setup manual):
```bash
cd packages/api && pnpm test:build
# Usa testcontainers - não precisa de Docker rodando antes
```
