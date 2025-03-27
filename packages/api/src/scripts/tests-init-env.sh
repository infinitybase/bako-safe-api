echo "Starting Redis Container..."
(cd ../../packages/redis && docker compose up -d)

echo "Starging Database Containers..."
(cd ../../packages/database && docker compose up -d)

echo "Starging Chain Containers..."
(cd ../../packages/chain && pnpm chain:dev:start)

echo "Starting Socket server.."
(cd ../../packages/socket-server && pnpm dev) &

echo "Starting API server..."
(pnpm dev)

echo "All services have been started!"
