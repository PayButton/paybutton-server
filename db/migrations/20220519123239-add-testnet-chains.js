'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
        await queryInterface.bulkInsert('chains', [
            {
                slug: 'bchtest',
                title: 'Bitcoin Cash Testnet',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                slug: 'bchreg',
                title: 'Bitcoin Cash Regtest',
                createdAt: new Date(),
                updatedAt: new Date()
            },
        ], {});
    },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('chains', { slug: 'bchtest' });
    await queryInterface.bulkDelete('chains', { slug: 'bchreg' });
  }
};
