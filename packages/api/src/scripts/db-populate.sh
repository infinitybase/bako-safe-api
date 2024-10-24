#!/bin/bash

SQL_DIR="./src/database/inserts"

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

if ! command -v psql &> /dev/null; then
  echo "❌ [ERROR]: psql is not installed. Please install PostgreSQL client before running the script."
  exit 1
fi

# Check if the execution environment is set to development
if [ "$API_ENVIRONMENT" != "development" ]; then
  echo "❌ [ERROR]: The execution environment is not set to development"
  exit 1
fi

# Check if the host is set to localhost
if [ "$DATABASE_HOST" != "127.0.0.1" ]; then
  echo "❌ [ERROR]: The database host is not set to localhost"
  exit 1
fi

echo -e "🔍 [INFO]: Initiating connection to the database...\n"
export PGPASSWORD="$DATABASE_PASSWORD"

# Execute each .sql file in the directory
for file in "$SQL_DIR"/*.sql; do
  if [ -f "$file" ]; then
    echo "$file..."
    psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" >/dev/null 2>&1<<EOF
-- Set session replication role to 'replica'
SET session_replication_role = 'replica';

-- Execute the SQL file
\i $file

-- Reset session replication role to 'origin'
SET session_replication_role = 'origin';
EOF
  else
    echo "❌ [ERROR]: No .sql files found in $SQL_DIR"
    exit 1
  fi
done

echo -e "\n\n✅ [DONE]: SQL execution successfully."
