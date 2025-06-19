build:
	pnpm install
	pnpm run build

socket-init:
	@echo "🚀 Building and starting Socket Server using .env.example..."; \
	if [ ! -f ".env.example" ]; then echo "❌ '.env.example' not found!" && exit 1; fi; \
	docker-compose -f docker-compose.yml --env-file .env.example up --build -d > /dev/null 2>&1

socket-down:
	@echo "🧹 Stopping Socket Server..."; \
	docker-compose -f docker-compose.yml --env-file .env.example down

socket-wait:
	@. .env.example; \
	container="$$SOCKET_NAME"; \
	echo "⏳ Waiting for $$container to be healthy..."; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
		echo "Still waiting for $$container..."; \
	done; \
	echo "✅ $$container is healthy."
