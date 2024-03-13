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

chain-start:
	sudo docker-compose -f docker/chain/docker-compose.yml --env-file ${env_file} up --build -d