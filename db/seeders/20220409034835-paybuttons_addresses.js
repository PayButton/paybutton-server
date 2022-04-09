'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert("paybuttons_addresses", [
      {
        paybutton_id: 1,
        address: "ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc"
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        address: "ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc"
        paybutton_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        address: "ecash:qry66pg4qvmthf90se33wm20mhx8pqgcdy5k5re8qh"
        paybutton_id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        address: "ecash:qzjw63hvptddl293zm9yyht5jxhgmgcykuw8jduy6u"
        paybutton_id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        address: "ecash:qzjw63hvptddl293zm9yyht5jxhgmgcykuw8jduy6u"
        paybutton_id: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete("paybuttons_addresses", null, {});
  }
};
