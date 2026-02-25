export DOCKER_API_VERSION ?= 1.44

cache-init:
	docker compose -f docker-compose.yml --env-file .env.example up --build -d > /dev/null 2>&1

cache-down:
	docker compose -f docker-compose.yml --env-file .env.example down > /dev/null 2>&1

cache-wait:
	container="redis-bako-dev"; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
	done; \
	echo "✅ $$container is healthy."
