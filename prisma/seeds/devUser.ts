export const createDevUserRawQueryList = [
  // user dev@paybutton.org
  'USE supertokens;',
  'INSERT INTO emailpassword_users VALUES (\'dev-uid\', \'dev@paybutton.org\', \'$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id',
  'INSERT INTO emailverification_verified_emails VALUES (\'dev-uid\', \'dev@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'dev-uid\', \'emailpassword\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  // user dev2@paybutton.org
  'INSERT INTO emailpassword_users VALUES (\'dev2-uid\', \'dev2@paybutton.org\', \'$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id',
  'INSERT INTO emailverification_verified_emails VALUES (\'dev2-uid\', \'dev2@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'dev2-uid\', \'emailpassword\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;'
]

export const userProfiles = [
  {
    id: 'dev-uid',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dev2-uid',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]
