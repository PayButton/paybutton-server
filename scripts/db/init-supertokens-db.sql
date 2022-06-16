CREATE DATABASE `supertokens`;
CREATE USER 'supertokens'@localhost IDENTIFIED BY 'supertokens';
GRANT ALL PRIVILEGES ON `supertokens`.* TO 'supertokens'@'%' IDENTIFIED BY 'supertokens' WITH GRANT OPTION;
