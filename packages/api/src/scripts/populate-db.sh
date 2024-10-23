#!/bin/bash

SQL_DIR="./src/database/inserts"

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)


if [ "$API_ENVIRONMENT" != "development" ]; then
  echo "❌ [ERROR]: The execution environment is not set to development"
  exit 1
fi

echo -e "🔍 [INFO]: Initiating connection to the database...\n"
export PGPASSWORD="$DATABASE_PASSWORD"
psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -c "SET session_replication_role = 'replica';" >/dev/null 2>&1


# Execute each .sql file in the directory
for file in "$SQL_DIR"/*.sql; do
  if [ -f "$file" ]; then
    echo "$file..."
    psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -f "$file" >/dev/null 2>&1
  else
    echo "❌ [ERROR]: No .sql files found in $SQL_DIR"
    exit 1
  fi
done

psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -c "COMMIT;" >/dev/null 2>&1
psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -c "SET session_replication_role = 'origin';" >/dev/null 2>&1



psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -c "ANALYZE;" >/dev/null 2>&1

echo -e "\n\n✅ [DONE]: SQL execution successfully."
