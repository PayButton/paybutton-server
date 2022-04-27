dev:
	docker-compose up --build -d

stop-dev:
	docker-compose down

check-logs-dev:
	docker logs -f paybutton-server_paybutton_1

check-logs-db:
	docker logs -f paybutton-server_mysql_1
