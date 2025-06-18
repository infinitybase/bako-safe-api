cache-init:
	@env_file=$${env_file:-.env.example}; \
	docker-compose -f docker-compose.yml --env-file $$env_file up --build -d > /dev/null 2>&1

cache-down:
	@env_file=$${env_file:-.env.example}; \
	docker-compose -f docker-compose.yml --env-file $$env_file down > /dev/null 2>&1

cache-wait:
	@env_file=$${env_file:-.env.example}; \
	source $$env_file; \
	container="$${REDIS_CONTAINER_NAME}"; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
	done
