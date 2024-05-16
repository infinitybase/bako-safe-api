# Bako Safe API

### Development
1. Install [Docker](https://docs.docker.com/engine/install/)
2. Install [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Run the chain: `cd packages/chain && pnpm chain:dev:start`
5. Run the database: `cd packages/database && pnpm db:dev:start`
6. Run the api in the root folder: `pnpm dev`

### Tests
1. Install [Docker](https://docs.docker.com/engine/install/)
2. Install [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Run the chain: `cd packages/chain && pnpm chain:dev:start`
5. Run the database: `cd packages/database && pnpm db:dev:start`
6. Run the api in the root folder: `pnpm dev`
7. In new terminal, run the tests: `cd packages/api && pnpm test`