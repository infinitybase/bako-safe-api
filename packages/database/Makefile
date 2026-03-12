export DOCKER_API_VERSION ?= 1.44
NETWORK_NAME ?= bako-network

.PHONY: ensure-network database-init database-down database-wait

ensure-network:
	@echo "🔧 Checking Docker network '$(NETWORK_NAME)'..."; \
	if ! docker network ls --format '{{.Name}}' | grep -q "^$(NETWORK_NAME)$$"; then \
		docker network create $(NETWORK_NAME) >/dev/null; \
		echo "✅ Network '$(NETWORK_NAME)' created."; \
	else \
		echo "✅ Network '$(NETWORK_NAME)' already exists."; \
	fi

database-init: ensure-network
	docker compose -f docker-compose.yml --env-file .env.example up --build -d
	@echo "✅ Database containers started."

database-down:
	docker compose -f docker-compose.yml --env-file .env.example down > /dev/null 2>&1
	@echo "🛑 Database containers stopped."

database-wait:
	@eval "$$(grep -v '^#' .env.example | xargs)"; \
	for container in "$${DATABASE_ENVIRONMENT}" "mongodb-$${MONGO_ENVIRONMENT}"; do \
		echo "⏳ Waiting for $$container..."; \
		until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
			sleep 2; \
			echo "Still waiting for $$container..."; \
		done; \
		echo "✅ $$container is healthy."; \
	done
