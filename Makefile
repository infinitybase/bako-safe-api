deploy-prod:
	sudo docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d

deploy-stg:
	sudo docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d

deploy-test:
	sudo docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d

database-init:
	sudo docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} up --build -d

database-down:
	sudo docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} down

dev-run:
	docker-compose -f docker-compose.dev.yml --env-file ${env_file} up --build -d

dev-down:
	docker-compose -f docker-compose.dev.yml --env-file ${env_file} down

dev-clean:
	docker-compose -f docker-compose.dev.yml --env-file ${env_file} down -v
