cache-init:
	docker-compose -f docker-compose.yml --env-file .env.example up --build -d > /dev/null 2>&1

cache-down:
	docker-compose -f docker-compose.yml --env-file .env.example down > /dev/null 2>&1

cache-wait:
	@. .env.example; \
	container="$$REDIS_CONTAINER_NAME"; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
	done; \
	echo "✅ $$container is healthy."
