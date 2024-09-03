up:
<<<<<<< Updated upstream
	docker compose -p bako-safe_dev --env-file .env.chain up -d --build > /dev/null 2>&1
=======
	docker compose -p bako-safe_dev --env-file .env.chain up -d --build  > /dev/null 2>&1
>>>>>>> Stashed changes

down:
	docker compose -p bako-safe_dev stop > /dev/null 2>&1

clean:
	docker compose -p bako-safe_dev down --rmi local -v --remove-orphans > /dev/null 2>&1
