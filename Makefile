git_hook_setup = cp .githooks/pre-commit .git/hooks/pre-commit
git_diff_to_master = git diff --name-only --diff-filter=ACMRTUXB origin/master > DIFF

dev:
	$(git_hook_setup)
	docker-compose up --build -d

stop-dev:
	docker-compose down

reset-dev:
	make stop-dev && make dev

logs-dev:
	docker logs -f paybutton-dev

logs-db:
	docker logs -f paybutton-db

logs-cache:
	docker logs -f paybutton-cache

logs-users:
	docker logs -f paybutton-users-service

lint:
	yarn eslint .

no-isolated-tests:
	grep -rEn '(describe|it)\.only' tests/* && exit 1 || echo No isolated tests.

lint-master:
	$(git_diff_to_master)
	yarn eslint --stdin --stdin-filename DIFF

test-unit:
	PRICE_API_URL="foo" PRICE_API_TOKEN="bar" DATABASE_URL="mysql://paybutton-test:paybutton-test@db:3306/paybutton-test" npx ts-node -O '{"module":"commonjs"}' node_modules/jest/bin/jest.js tests/unittests --forceExit

test-integration:
	sleep 15
	sed -i "s/db/localhost/g" .env.test
	sed -i "s/paybutton-cache/localhost/g" .env.test
	yarn ci:integration:test
