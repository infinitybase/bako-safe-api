echo "Iniciando Redis Container..."
(cd ../../packages/redis && docker compose up -d)

echo "Iniciando Database Containers..."
(cd ../../packages/database && docker compose up -d)

echo "Iniciando Chain Containers..."
(cd ../../packages/chain && pnpm chain:dev:start)

echo "Iniciando Socket server.."
(cd ../../packages/socket-server && pnpm dev) &

echo "Iniciando API server..."
(pnpm dev)

echo "Todos os serviços foram iniciados!"


