# Bako Safe API

## Tests
1. Install [Docker](https://docs.docker.com/engine/install/)
2. Install [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Run the chain: `cd packages/chain && pnpm chain:test:start`
5. Run the database: `cd packages/database && pnpm db:test:start`
6. Run the tests in the root folder: `pnpm test`

## Development
1. Install dependencies with pnpm: `pnpm install`
2. Set up the `.env` file in:
    - [`packages/api`](./packages/api)
    - [`packages/database`](./packages/database)
    - [`packages/socket-server`](./packages/socket-server)
3. Run the chain: `cd packages/chain && pnpm chain:dev:start`
4. Run the database: `cd packages/database && pnpm db:dev:start`
5. Run the server in the root folder: `pnpm dev`