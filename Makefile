git_hook_setup = cp .githooks/pre-commit .git/hooks/pre-commit
git_diff_to_master = git diff --name-only --diff-filter=ACMRTUXB origin/master > DIFF
create_test_paybutton_json = echo { \"priceAPIURL\": \"foo\", \"networkBlockchainClients\": { \"ecash\": \"chronik\", \"bitcoincash\": \"grpc\" }, \"chronikClientURL\": \"https://chronik.be.cash/xec\", \"wsBaseURL\": \"localhost:5000\" } > paybutton-config.json
touch_local_env = touch .env.local

prod:
	$(git_hook_setup)
	$(touch_local_env)
	docker-compose -f docker-compose-prod.yml --env-file .env --env-file .env.local up --build -d

stop-prod:
	docker-compose -f docker-compose-prod.yml down

reset-prod:
	make stop-prod && make prod

dev:
	$(git_hook_setup)
	$(touch_local_env)
	docker-compose --env-file .env --env-file .env.local up --build -d

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

# WARNING: this shouldn't be run on local machine, only on github. It will replace your config file
github-test-unit:
	$(create_test_paybutton_json)
	$(touch_local_env)
	WS_AUTH_KEY="test" PRICE_API_TOKEN="foo" DATABASE_URL="mysql://paybutton-user-test:paybutton-password@db:3306/paybutton-test" npx ts-node -O '{"module":"commonjs"}' node_modules/jest/bin/jest.js tests/unittests --forceExit

# WARNING: this shouldn't be run on local machine, only on github. It will replace your config file
github-test-integration:
	sleep 15
	$(create_test_paybutton_json)
	$(touch_local_env)
	sed -i "s/db/localhost/g" .env.test
	sed -i "s/paybutton-cache/localhost/g" .env.test
	yarn ci:integration:test
