'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
      await queryInterface.addColumn('paybuttons_addresses',
      'chainId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'chains',
          key: 'id'
        }
      },
      );
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.removeColumn('paybuttons_addresses', 'chainId')
  }
};
