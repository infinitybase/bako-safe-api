# Infinity REST API Starter Kit

The main purpose of this repository is to setup quickly a working Node.js API Server with TypeScript, automated tests, code style checks and commit message validation.

## Installation

1. Make sure you have a package manager ([yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)).
2. Make sure you have [node](https://nodejs.org/en/).
3. Install [Docker](https://www.docker.com/) to setup a PostgreSQL database.
3. Clone this repository.
```bash
git clone https://github.com/infinitybase/template-node-api.git
```
4. Setup a PostgreSQL database.
```bash
docker run --name project_name -e POSTGRES_PASSWORD=database_password -e POSTGRES_DB=database_name -d database_username -p 5432:5432
```
5. Install node dependencies (with `yarn` or `npm`, you 
 can decide).  
```bash
yarn install
```
6. Setup a `.env` file from the `.env.example`  
Replace `DATABASE_USERNAME`, `DATABASE_PASSWORD` and `DATABASE_NAME` with credentials you used on **step 4**.
7. Run pending database migrations.
```bash
yarn run migration:run
```
8. Start the API using development enviroment.
```bash
yarn run dev
```

## Usage
### Successful responses
In any controller you can set a successful status code (`200`–`299`).  

For example (Content created `201`):  
```javascript
import successful, { Responses } from '@utils/successful';

// [...]

static async hello() {
  const result = {
    testing: 'Hello, world!',
  };

  return successful(result, Responses.Created);
}
```

Or with default status (`200`):
```javascript
import successful from '@utils/successful';

// [...]

static async hello() {
  const result = {
    testing: 'Hello, world!',
  };

  return successful(result);
}
```

### Error responses
In any controller you can throw an error (`NotFound`, `BadRequest`, `GeneralError` – check `utils/error` folder).  
You can create your own error class that use status code between `400`–`599`.    

For example:  
```javascript
import { NotFound, BadRequest } from '@utils/error';

// [...]

static async randomEndpoint() {
  throw new NotFound({
    type: 'ABCException',
    title: 'Não encontramos essa [recurso].',
    detail: 'Verifique e tente novamente.',
  });
}
```
Response:
```javascript
{
    "origin": "app",    // Can be app (you) / body (body validation) / query (url validation) / unknown (server)
    "errors": [
        {
            "type": "ABCException",
            "title": "Não encontramos essa rota.",
            "detail": "Verifique e tente novamente."
        }
    ]
}
```

## Folder structure
```bash
src
├── database
│   └── migrations            # TypeORM migrations
├── entities                  # TypeORM models
├── middlewares               # Midlewares (error, permissions, etc)
├── modules                   # Modules (internal routes + payload validation + controller)
├── routes.ts                 # API Routes (relatives to module)
└── utils                     # Global utilities
    ├── error                 # Global error responses
    ├── successful            # Global successful responses
    ├── handleResponse.ts     # Global response hasndler
    └── validator.ts          # Global query/body validator
```

## Running the scripts
All the different scripts are orchestrated via [npm scripts](https://docs.npmjs.com/misc/scripts).
NPM scripts basically allow us to call (and chain) terminal commands via `npm`.

| Script | Description |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `dev`                   | Run the API on **development** mode. It will watch your file changes.                  |
| `test`                   | Run tests using [jest](https://jestjs.io/).     |
| `start`                   | Run the API on **production** mode. You need run `build` before.       |
| `build`                   | Full build. It prepares the API to work with `start` script.       |
| `migration:run`                   | Once you have a migration to run, you can run them.                                      |
| `migration:create`                   | Create a new migration.                                      |
| `migration:revert`                    | If for some reason you want to revert the changes, you can run it. |
| `prepare`                    |It's a npm script. Runs any time before the package is packed.       |

## Contributing
Pull requests are welcome. We currently need to develop these features:
- TypeORM Seeding;
- API versionating (v1, v2, v3, vn...);
- Permissions middleware;
- Rate limit (safe middleware).  
 
Please make sure to update tests as appropriate.
