export DOCKER_API_VERSION ?= 1.44

deploy:
	docker compose -f docker-compose.yml --env-file ${env_file} up --build -d