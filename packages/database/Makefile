database-init:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d > /dev/null 2>&1

database-down:
	docker-compose -f docker-compose.yml --env-file ${env_file} down //kill -9 -> id vinculado ao docker
