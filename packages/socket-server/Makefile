build:
	pnpm install
	pnpm run build

socket-init:
	@env_file=$${env_file:-.env.example}; \
	echo "🚀 Building and starting Socket Server using $$env_file..."; \
	if [ ! -f "$$env_file" ]; then echo "❌ '$$env_file' not found!" && exit 1; fi; \
	docker-compose -f docker-compose.yml --env-file $$env_file up --build -d > /dev/null 2>&1

socket-down:
	@env_file=$${env_file:-.env.example}; \
	echo "🧹 Stopping Socket Server..."; \
	docker-compose -f docker-compose.yml --env-file $$env_file down

socket-wait:
	@env_file=$${env_file:-.env.example}; \
	. $$env_file; \
	container="$$SOCKET_NAME"; \
	echo "⏳ Waiting for $$container to be healthy..."; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
		echo "Still waiting for $$container..."; \
	done; \
	echo "✅ $$container is healthy."
