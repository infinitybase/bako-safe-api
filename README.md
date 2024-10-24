# Bako Safe API

### Development

1. Install [Docker](https://docs.docker.com/engine/install/)
2. Install [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Run the api in the root folder: `pnpm dev`

### Tests

1. Install [Docker](https://docs.docker.com/engine/install/)
2. Install [PNPM](https://pnpm.io/installation#using-npm): `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Run the api in the root folder: `pnpm dev`
5. In new terminal, run the tests: `cd packages/api && pnpm test`

### Database utilities:

#### Populate DB

1. Copy your scripts to insert infos to path `packages/api/database/inserts`
2. Run script `cd packages/api && pnpm migration:populate`
