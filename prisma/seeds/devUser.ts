export const createDevUserRawQueryList = [
  'USE supertokens;',
  'INSERT INTO emailpassword_users VALUES (\'dev-uid\', \'dev@paybutton.org\', \'$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id',
  'INSERT INTO emailverification_verified_emails VALUES (\'dev-uid\', \'dev@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'dev-uid\', \'emailpassword\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;'
]
