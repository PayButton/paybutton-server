SELECT SLEEP(20);
USE `supertokens`;
INSERT INTO emailpassword_users VALUES ('dev-uid', 'dev@mail.com', '$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO', 1652220489244);
INSERT INTO emailverification_verified_emails VALUES ('dev-uid', 'dev@mail.com');
INSERT INTO all_auth_recipe_users VALUES ('dev-uid', 'emailpassword', 1652220489244);
