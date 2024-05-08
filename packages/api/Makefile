deploy-prod:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d  

deploy-stg:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d 

deploy-test:
	docker-compose -f docker-compose.yml --env-file ${env_file} up --build -d

database-init:
	docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} up --build -d

database-down:
	docker-compose -f docker/database/docker-compose.yml --env-file ${env_file} down

chain-start:
	docker-compose -f docker/chain/docker-compose.yml --env-file ${env_file} up --build -d

run-tests:
	@echo "Running API tests in the background..."
	@pnpm api:test > /dev/null 2>&1 &
	@echo "Waiting for API tests to run..."
	@sleep 10
	@echo "Running Jest tests..."
	@NODE_ENV=test node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand; \
	JEST_EXIT_CODE=$$?; \
	CHAIN_RUNNING=$$(docker ps | grep bsafe_chain | wc -l); \
	if [ $$JEST_EXIT_CODE -ne 0 ]; then \
		echo "Stopping containers..."; \
		docker rm -f bsafe_database_test; \
		if [ $$CHAIN_RUNNING -eq 0 ]; then \
			echo "Stopping bsafe_chain container..."; \
			docker rm -f bsafe_faucet; \
			docker rm -f bsafe_fuel-core; \
		else \
			echo "bsafe_chain is still running, not stopping it."; \
		fi; \
		exit $$JEST_EXIT_CODE; \
	else \
		echo "Stopping containers..."; \
		docker rm -f bsafe_database_test; \
		if [ $$CHAIN_RUNNING -eq 0 ]; then \
			docker rm -f bsafe_faucet; \
			docker rm -f bsafe_fuel-core; \
		else \
			echo "bsafe_chain is still running, not stopping it."; \
		fi; \
		echo "Jest tests passed"; \
	fi


