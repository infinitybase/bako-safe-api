#!/bin/bash
if [ -z "$1" ]; then
    echo "You must provide a name for the migration."
  exit 1
fi

pnpm ts-node -r tsconfig-paths/register -r dotenv/config ./node_modules/typeorm/cli.js migration:create src/database/migrations/$1
