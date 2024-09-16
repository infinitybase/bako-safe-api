up:
	docker compose -p bako-safe_dev --env-file .env.chain up -d --build

down:
	docker compose -p bako-safe_dev stop > /dev/null 2>&1

clean:
	docker compose -p bako-safe_dev down --rmi local -v --remove-orphans > /dev/null 2>&1

// ed8caa7e41699a1442ff4cd39a5802670f7bb31b86332bc06dbf60f1c35e3aca9fce1d7c37757c42b8fa14bf3dedb4cfde79a64cee0a5de0a57cd387918a24d531890e79ac2c8430448c3f2c39c5ae67