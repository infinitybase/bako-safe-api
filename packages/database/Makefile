database-init:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d > /dev/null 2>&1

database-down:
	docker-compose -f docker-compose.yml --env-file ${env_file} down > /dev/null 2>&1

database-wait:
	@env_file=$${env_file:-.env.example}; \
	source $$env_file; \
	for container in "$${DATABASE_ENVIRONMENT}" "mongodb-$${MONGO_ENVIRONMENT}"; do \
		until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$container 2>/dev/null)" = "healthy" ]; do \
			sleep 2; \
		done; \
		echo "✅ $$container is healthy."; \
	done
