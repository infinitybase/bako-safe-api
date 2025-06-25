deploy:
	@env_file=$${env_file:-.env.example}; \
	echo "Using $$env_file"; \
	if [ ! -f "$$env_file" ]; then echo "❌ Env file '$$env_file' not found!" && exit 1; fi; \
	docker-compose -f docker-compose.yml --env-file $$env_file up --build -d > /dev/null 2>&1
