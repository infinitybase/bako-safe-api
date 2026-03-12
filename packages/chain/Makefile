up:
	docker compose -p bako-safe_dev --env-file .env.chain up -d --build  > /dev/null 2>&1
	@echo "✅ Chain containers started."

wait:
	@echo "⏳ Waiting for fuel-core to be healthy..."; \
	until [ "$$(docker inspect -f '{{.State.Health.Status}}' bakosafe_fuel-core 2>/dev/null)" = "healthy" ]; do \
		sleep 2; \
		echo "Still waiting for fuel-core..."; \
	done; \
	echo "✅ fuel-core is healthy."

down:
	docker compose -p bako-safe_dev stop > /dev/null 2>&1

clean:
	docker compose -p bako-safe_dev down --rmi local -v --remove-orphans > /dev/null 2>&1
