git_hook_setup = cp .githooks/pre-commit .git/hooks/pre-commit

dev:
	$(git_hook_setup)
	docker-compose up --build -d

stop-dev:
	docker-compose down

check-logs-dev:
	docker logs -f paybutton-dev

check-logs-db:
	docker logs -f paybutton-db

check-logs-users:
	docker logs -f paybutton-users-service
