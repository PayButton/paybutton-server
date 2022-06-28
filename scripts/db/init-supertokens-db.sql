CREATE DATABASE `supertokens`;
CREATE USER 'supertokens'@localhost IDENTIFIED BY 'supertokens';
GRANT ALL PRIVILEGES ON `supertokens`.* TO 'supertokens'@'%' IDENTIFIED BY 'supertokens' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `supertokens`.* TO 'paybutton'@'%' IDENTIFIED BY 'paybutton' WITH GRANT OPTION;
