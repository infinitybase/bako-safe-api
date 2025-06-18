build:
	pnpm install
	pnpm run build

socket-init: build
	@env_file=$${env_file:-.env.example}; \
	if [ ! -f "$$env_file" ]; then echo "❌ Env file '$$env_file' not found!" && exit 1; fi; \
	docker-compose -f docker-compose.yml --env-file $$env_file up --build -d > /dev/null 2>&1

socket-down:
	@env_file=$${env_file:-.env.example}; \
	docker-compose -f docker-compose.yml --env-file $$env_file down > /dev/null 2>&1

socket-wait:
	@env_file=$${env_file:-.env.example}; \
	source $$env_file; \
	container="$${SOCKET_NAME}"; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
	done; \
