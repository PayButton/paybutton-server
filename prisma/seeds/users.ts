export const createDevUsersRawQueryList = [
  'USE supertokens;',
  'INSERT INTO app_id_to_user_id VALUES (\'public\', \'dev-uid\', \'dev-uid\', 0, \'emailpassword\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO app_id_to_user_id VALUES (\'public\', \'dev2-uid\', \'dev2-uid\', 0, \'emailpassword\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_users VALUES (\'public\', \'dev-uid\', \'dev@paybutton.org\', \'$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_users VALUES (\'public\', \'dev2-uid\', \'dev2@paybutton.org\', \'$2a$11$AGppTnFU3HBeHuH1z3kPb.A1WFUxHVVNmAmiMaHJ3QvVkWT58jxBO\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailverification_verified_emails VALUES (\'public\', \'dev-uid\', \'dev@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailverification_verified_emails VALUES (\'public\', \'dev2-uid\', \'dev2@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'public\', \'public\', \'dev-uid\', \'dev-uid\', 0, \'emailpassword\', 1652220489244, 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'public\', \'public\', \'dev2-uid\', \'dev2-uid\', 0, \'emailpassword\', 1652220489244, 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_user_to_tenant VALUES (\'public\', \'public\', \'dev-uid\', \'dev@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_user_to_tenant VALUES (\'public\', \'public\', \'dev2-uid\', \'dev2@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;'
]

export const devUserProfiles = [
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

export const createAdminUserRawQueryList = [
  'USE supertokens;',
  // create the dashboard user
  'INSERT INTO dashboard_users VALUES (\'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'admin@paybutton.org\', \'$2a$11$/QAw1kqTCkOXDlBLE2McMu70zFkGJdlX..PDI4BqDYEOgpYyTxCn.\', 1692381805105) ON DUPLICATE KEY UPDATE user_id=user_id;',
  // create the actual user, which is not related, but with the same data
  'INSERT INTO app_id_to_user_id VALUES (\'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', 0, \'emailpassword\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_users VALUES (\'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'admin@paybutton.org\', \'$2a$11$/QAw1kqTCkOXDlBLE2McMu70zFkGJdlX..PDI4BqDYEOgpYyTxCn.\', 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailverification_verified_emails VALUES (\'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'admin@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO all_auth_recipe_users VALUES (\'public\', \'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', 0, \'emailpassword\', 1652220489244, 1652220489244) ON DUPLICATE KEY UPDATE user_id=user_id;',
  'INSERT INTO emailpassword_user_to_tenant VALUES (\'public\', \'public\', \'085211a0-215f-4f3f-bf07-68f55bb6c7ed\', \'admin@paybutton.org\') ON DUPLICATE KEY UPDATE user_id=user_id;'
]

export const adminUserProfiles = [
  {
    id: '085211a0-215f-4f3f-bf07-68f55bb6c7ed',
    createdAt: new Date(),
    updatedAt: new Date(),
    isAdmin: true
  }
]
