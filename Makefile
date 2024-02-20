prod:
	sudo docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d  

stg:
	sudo docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d 

