CREATE DATABASE `supertokens`;
CREATE USER '${SUPERTOKENS_DB_USER}'@localhost IDENTIFIED BY '${SUPERTOKENS_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON `supertokens`.* TO '${SUPERTOKENS_DB_USER}'@'%' IDENTIFIED BY '${SUPERTOKENS_DB_PASSWORD}' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `supertokens`.* TO '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}' WITH GRANT OPTION;
FLUSH PRIVILEGES;
