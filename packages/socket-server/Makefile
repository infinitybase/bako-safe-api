build:
	pnpm install
	pnpm run build

socket-init:
	@echo "🚀 Building and starting Socket Server..."; \
	docker-compose -f docker-compose.yml up --build -d

socket-down:
	@echo "🧹 Stopping Socket Server..."; \
	docker-compose -f docker-compose.yml down

socket-wait:
	@echo "⏳ Waiting for bako-socket-server to be healthy..."; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' bako-socket-server 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
		echo "Still waiting for bako-socket-server..."; \
	done; \
	echo "✅ bako-socket-server is healthy."
