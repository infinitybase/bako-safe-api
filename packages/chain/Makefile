up:
	docker compose -p bako-safe_dev --env-file .env up -d --build > /dev/null 2>&1

down:
	docker compose -p bako-safe_dev stop > /dev/null 2>&1

clean:
	docker compose -p bako-safe_dev down --rmi local -v --remove-orphans > /dev/null 2>&1
