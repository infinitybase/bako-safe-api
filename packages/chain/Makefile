up:
	docker compose -p bako-safe_dev --env-file .env up -d --build

down:
	docker compose -p bako-safe_dev stop

clean:
	docker compose -p bako-safe_dev down --rmi local -v --remove-orphans
