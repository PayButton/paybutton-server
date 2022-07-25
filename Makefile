git_hook_setup = cp .githooks/pre-commit .git/hooks/pre-commit
git_diff_to_master = git diff --name-only --diff-filter=ACMRTUXB origin/master > DIFF

build:
	docker build -f Dockerfile -t paybutton-server .
dev:
	$(git_hook_setup)
	make build
	docker-compose up -d

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

lint:
	npx --yes ts-standard .

lint-master:
	$(git_diff_to_master)
	npx --yes ts-standard --stdin --stdin-filename DIFF

test-unit:
	DATABASE_URL="mysql://paybutton-test:paybutton-test@db:3306/paybutton-test" npx ts-node -O '{"module":"commonjs"}' node_modules/jest/bin/jest.js tests/unittests --forceExit

test-integration:
	sleep 15
	sed -i "s/db/localhost/g" .env.test
	yarn ci:integration:test
