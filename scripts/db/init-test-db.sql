CREATE DATABASE `paybutton-test`;
CREATE USER 'paybutton-test'@localhost IDENTIFIED BY 'paybutton-test';
GRANT ALL PRIVILEGES ON `paybutton-test`.* TO 'paybutton-test'@'%' IDENTIFIED BY 'paybutton-test' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `supertokens`.* TO 'paybutton-test'@'%' IDENTIFIED BY 'paybutton-test' WITH GRANT OPTION;
