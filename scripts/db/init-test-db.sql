CREATE DATABASE `paybutton-test`;
CREATE USER '${MYSQL_USER}-test'@localhost IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON `${MYSQL_DATABASE}-test`.* TO '${MYSQL_USER}-test'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `supertokens`.* TO '${MYSQL_USER}-test'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}' WITH GRANT OPTION;
FLUSH PRIVILEGES;
