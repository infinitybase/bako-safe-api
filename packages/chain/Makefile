up:
	docker compose -p dev --env-file .env up -d --build > /dev/null 2>&1

down:
	docker compose -p dev stop

clean:
	docker compose -p dev down --rmi local -v --remove-orphans > /dev/null 2>&1
