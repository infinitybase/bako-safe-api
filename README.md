# Bako Safe API

Bako Safe is a multisig wallet solution built on the [Fuel Network](https://fuel.network/). This repository contains the backend API and supporting services for the Bako Safe ecosystem.

## Architecture

```
bako-safe-api/
├── packages/
│   ├── api/            # Main REST API (Express + TypeORM)
│   ├── socket-server/  # WebSocket server for real-time events
│   ├── database/       # PostgreSQL + MongoDB Docker setup
│   ├── redis/          # Redis cache Docker setup
│   ├── chain/          # Local Fuel network (fuel-core + faucet)
│   ├── worker/         # Background jobs (Bull + Redis)
│   └── metabase/       # Analytics dashboard
```

## Requirements

- [Docker](https://docs.docker.com/engine/install/) (v20.10+ with Docker Compose V2)
- [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
- Node.js 20+

## Development

### Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment files:
   ```bash
   cp packages/api/.env.example packages/api/.env
   cp packages/database/.env.example packages/database/.env
   cp packages/redis/.env.example packages/redis/.env
   cp packages/socket-server/.env.example packages/socket-server/.env
   ```

3. Run the API (network is created automatically):
   ```bash
   pnpm dev
   ```

4. Verify everything is running:
   ```bash
   curl http://localhost:3333/ping
   curl http://localhost:3333/healthcheck
   docker ps  # Should show 6 healthy containers
   ```

### Manual Setup (Step by Step)

If you need more control, start services individually:

1. Create Docker network:
   ```bash
   docker network create bako-network
   ```

2. Start database:
   ```bash
   cd packages/database && docker compose --env-file .env.example up -d
   # Wait for healthy: docker ps | grep postgres
   ```

3. Start Redis:
   ```bash
   cd packages/redis && docker compose --env-file .env.example up -d
   ```

4. Start Fuel Chain (local network):
   ```bash
   cd packages/chain && docker compose -p bako-safe_dev --env-file .env.chain up -d --build
   # Wait for healthy: curl http://127.0.0.1:4000/v1/health
   ```

5. Start Socket Server:
   ```bash
   cd packages/socket-server && docker compose up -d --build
   ```

6. Start API:
   ```bash
   cd packages/api && pnpm dev
   ```

### Environment Variables

Key environment variables in `packages/api/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_HOST` | PostgreSQL host | `127.0.0.1` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `REDIS_URL_WRITE` | Redis write URL | `redis://localhost:6379` |
| `REDIS_URL_READ` | Redis read URL | `redis://localhost:6379` |
| `FUEL_PROVIDER` | Fuel network GraphQL endpoint | `http://127.0.0.1:4000/v1/graphql` |
| `SOCKET_URL` | Socket server URL | `http://localhost:3001` |
| `UI_URL` | Frontend URL (for CORS) | `http://localhost:5174` |
| `RIG_ID_CONTRACT` | RIG contract address (optional in dev) | - |

See `packages/api/.env.example` for the complete list with descriptions.

## Database

### Migrations

Migrations are managed by TypeORM and run automatically on API startup.

To run migrations manually:
```bash
cd packages/api && pnpm migration:run
```

To create a new migration:
```bash
cd packages/api && pnpm migration:create
```

To revert the last migration:
```bash
cd packages/api && pnpm migration:revert
```

### Utilities

Populate database with test data:
```bash
cd packages/api && pnpm database:populate
```

Clear all database data:
```bash
cd packages/api && pnpm database:clear
```

## Tests

Run tests with testcontainers (recommended, no manual setup needed):
```bash
cd packages/api && pnpm test:build
```

Or with the development environment running:
```bash
cd packages/api && pnpm test
```

## API Endpoints

Base URL: `http://localhost:3333`

| Route | Description |
|-------|-------------|
| `GET /ping` | Health check with timestamp |
| `GET /healthcheck` | Simple health check |
| `/auth/*` | Authentication endpoints |
| `/user/*` | User management |
| `/workspace/*` | Workspace management |
| `/predicate/*` | Predicate (vault) operations |
| `/transaction/*` | Transaction management |
| `/notifications/*` | User notifications |
| `/address-book/*` | Address book management |
| `/api-token/*` | API token management |
| `/cli/*` | CLI authentication |
| `/connections/*` | dApp connections |

## Troubleshooting

### Docker Compose Version Error

If you see "client version is too old", ensure you're using Docker Compose V2:
```bash
docker compose version  # Should show v2.x.x
```

### Fuel Provider Connection Error

Ensure the fuel-core container is running and healthy:
```bash
docker ps | grep fuel-core
curl http://127.0.0.1:4000/v1/health
```

### Port Already in Use

Stop any running containers and processes:
```bash
docker ps -aq | xargs docker stop
pkill -f "ts-node-dev"
```

### Database Connection Error

Verify PostgreSQL is running and accessible:
```bash
docker ps | grep postgres
docker logs postgres
```

### Network Not Found

Create the Docker network:
```bash
docker network create bako-network
```

### Socket Server SSL Error

If socket-server fails with "server does not support SSL connections", ensure `DATABASE_HOST` is set to a local value (`127.0.0.1`, `localhost`, `db`, or `postgres`).

## Cleanup

Stop all containers:
```bash
docker ps -aq | xargs docker stop && docker ps -aq | xargs docker rm
```

Remove volumes (warning: deletes data):
```bash
docker volume ls -q | grep -E "bako|fuel" | xargs docker volume rm
```

## License

Apache-2.0
