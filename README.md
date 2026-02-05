# Bako Safe API

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

3. Create Docker network:
   ```bash
   docker network create bako-network
   ```

4. Run the API in the root folder:
   ```bash
   pnpm dev
   ```

### Manual Setup (Step by Step)

If `pnpm dev` doesn't work, you can start services manually:

1. Start database:
   ```bash
   cd packages/database && docker compose --env-file .env.example up -d
   ```

2. Start Redis:
   ```bash
   cd packages/redis && docker compose --env-file .env.example up -d
   ```

3. Start Fuel Chain (local network):
   ```bash
   cd packages/chain && docker compose -p bako-safe_dev --env-file .env.chain up -d --build
   ```

4. Start Socket Server:
   ```bash
   cd packages/socket-server && docker compose up -d --build
   ```

5. Start API:
   ```bash
   cd packages/api && pnpm dev
   ```

### Environment Variables

Key environment variables in `packages/api/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_HOST` | PostgreSQL host | `127.0.0.1` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `FUEL_PROVIDER` | Fuel network GraphQL endpoint | `http://127.0.0.1:4000/v1/graphql` |
| `SOCKET_URL` | Socket server URL | `http://localhost:3001` |
| `RIG_ID_CONTRACT` | RIG contract address (mainnet only) | - |

## Tests

1. Ensure the development environment is running
2. Run the tests:
   ```bash
   cd packages/api && pnpm test
   ```

Or run tests with testcontainers (no manual setup needed):
```bash
cd packages/api && pnpm test:build
```

## Database Utilities

### Populate DB

1. Copy your scripts to insert data to `packages/api/database/inserts`
2. Run script:
   ```bash
   cd packages/api && pnpm database:populate
   ```

### Clear DB

```bash
cd packages/api && pnpm database:clear
```

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

### Network Not Found

Create the Docker network:
```bash
docker network create bako-network
```
