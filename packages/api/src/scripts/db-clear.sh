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

SQL_COMMAND="DO
\$\$
DECLARE
    r RECORD;
BEGIN
    -- Desabilitar todas as chaves estrangeiras temporariamente
    EXECUTE 'SET session_replication_role = replica';

    -- Loop para dropar todas as tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Habilitar novamente as chaves estrangeiras
    EXECUTE 'SET session_replication_role = DEFAULT';
END
\$\$;"

echo "Conectando ao banco de dados e removendo todas as tabelas..."
psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -h "$DATABASE_HOST" -p "$DATABASE_PORT" -c "$SQL_COMMAND" >/dev/null 2>&1


if [ $? -eq 0 ]; then
  echo "Tabelas removidas com sucesso!"
else
  echo "Erro ao tentar remover as tabelas."
fi