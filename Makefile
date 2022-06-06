git_hook_setup = cp .githooks/pre-commit .git/hooks/pre-commit
git_diff_to_master = git diff --name-only --diff-filter=ACMRTUXB origin/master > DIFF

dev:
	$(git_hook_setup)
	docker-compose up --build -d

stop-dev:
	docker-compose down

reset-dev:
	make stop-dev && make dev

check-logs-dev:
	docker logs -f paybutton-dev

check-logs-db:
	docker logs -f paybutton-db

check-logs-users:
	docker logs -f paybutton-users-service

lint-master:
	$(git_diff_to_master)
	npx --yes ts-standard --stdin --stdin-filename DIFF

