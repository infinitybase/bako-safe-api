#!/bin/bash

set -e

export DOCKER_API_VERSION="${DOCKER_API_VERSION:-1.44}"

# Ensure Docker network exists
ensure_network() {
  local NETWORK_NAME="bako-network"
  echo "🔧 Checking for network '$NETWORK_NAME'..."

  if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    docker network create "$NETWORK_NAME"
    echo "✅ Network '$NETWORK_NAME' created."
  else
    echo "✅ Network '$NETWORK_NAME' already exists."
  fi
}

# Start local Fuel chain network
start_chain_network() {
  local CHAIN_DIR="packages/chain"
  echo "🔗 Starting Fuel local chain network..."

  cd "$CHAIN_DIR"
  docker compose -p bako-safe_dev --env-file .env.chain up -d --build > /dev/null 2>&1
  cd - > /dev/null

  echo "✅ Fuel chain network started."
}

# Start database services
start_database_services() {
  local DB_DIR="packages/database"
  echo "🔄 Starting database services..."

  cd "$DB_DIR"
  pnpm run db:dev:start
  cd - > /dev/null

  echo "✅ Database services ready."
}

# Start Redis service
start_redis_service() {
  local REDIS_DIR="packages/redis"
  echo "🔄 Starting Redis service..."

  cd "$REDIS_DIR"
  pnpm run redis:dev:start
  cd - > /dev/null

  echo "✅ Redis service ready."
}

# Start Socket Server
start_socket_server() {
  local SOCKET_DIR="packages/socket-server"
  echo "🚀 Starting Socket Server..."

  cd "$SOCKET_DIR"
  pnpm run socket-server:dev:start
  cd - > /dev/null

  echo "✅ Socket Server ready."
}

# -------- Main flow --------

ensure_network
start_chain_network
start_database_services
start_redis_service
start_socket_server
