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

lint:
	yarn eslint .

no-isolated-tests:
	grep -rEq '(describe|it)\.only' tests/* && exit 1

lint-master:
	$(git_diff_to_master)
	yarn eslint --stdin --stdin-filename DIFF

test-unit:
	PRICE_API_URL="foo" DATABASE_URL="mysql://paybutton-test:paybutton-test@db:3306/paybutton-test" npx ts-node -O '{"module":"commonjs"}' node_modules/jest/bin/jest.js tests/unittests --forceExit

test-integration:
	sleep 15
	sed -i "s/db/localhost/g" .env.test
	yarn ci:integration:test
