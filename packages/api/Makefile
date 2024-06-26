deploy-prod:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d  > /dev/null 2>&1

deploy-stg:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d  > /dev/null 2>&1

deploy-test:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d  > /dev/null 2>&1

database-init:
	docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} up --build -d

database-down:
	docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} down

chain-start:
	docker-compose -f docker/chain/docker-compose.yml --env-file ${env_file} up --build -d