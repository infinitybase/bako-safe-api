database-init:
	docker-compose -f docker-compose.yml --env-file .env.example up --build -d > /dev/null 2>&1
	@echo "✅ Database containers started."

database-down:
	docker-compose -f docker-compose.yml --env-file .env.example down > /dev/null 2>&1
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
