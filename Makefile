git_hook_setup = git config core.hooksPath .githooks

dev:
	$(git_hook_setup)
	docker-compose up --build -d

stop-dev:
	docker-compose down

check-logs-dev:
	docker logs -f paybutton-server_paybutton_1

check-logs-db:
	docker logs -f paybutton-server_db_1

check-logs-users:
	docker logs -f paybutton-server_users-service_1

