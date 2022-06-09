ALTER TABLE `Paybutton`
ADD COLUMN `name` VARCHAR(255) NOT NULL AFTER `id`;

ALTER TABLE `Paybutton`
ADD COLUMN `uuid` UUID AFTER `name`;

ALTER TABLE `Paybutton`
ADD COLUMN `buttonData` TEXT AFTER `uuid`;

ALTER TABLE `Paybutton` ADD CONSTRAINT `Paybutton_name_providerUserId_unique_constraint` UNIQUE (`name`, `providerUserId`);
