export DOCKER_API_VERSION ?= 1.44
NETWORK_NAME ?= bako-network

.PHONY: build socket-init socket-down socket-wait ensure-network

build:
	pnpm install
	pnpm run build

ensure-network:
	@echo "🔧 Checking Docker network '$(NETWORK_NAME)'..."; \
	if ! docker network ls --format '{{.Name}}' | grep -q "^$(NETWORK_NAME)$$"; then \
		docker network create $(NETWORK_NAME) >/dev/null; \
		echo "✅ Network '$(NETWORK_NAME)' created."; \
	else \
		echo "✅ Network '$(NETWORK_NAME)' already exists."; \
	fi

socket-init: ensure-network
	@echo "🚀 Building and starting Socket Server..."; \
	docker compose -f docker-compose.yml up --build -d

socket-down:
	@echo "🧹 Stopping Socket Server..."; \
	docker compose -f docker-compose.yml down

socket-wait:
	@echo "⏳ Waiting for bako-socket-server to be healthy..."; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' bako-socket-server 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
		echo "Still waiting for bako-socket-server..."; \
	done; \
	echo "✅ bako-socket-server is healthy."
