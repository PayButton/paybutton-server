'use strict';

module.exports = {
    async up (queryInterface, Sequelize) {
        await queryInterface.bulkInsert('chains', [
            {
                slug: 'bitcoincash',
                title: 'Bitcoin Cash',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                slug: 'ecash',
                title: 'eCash',
                createdAt: new Date(),
                updatedAt: new Date()
            },
        ], {});
    },

    async down (queryInterface, Sequelize) {
        await queryInterface.bulkDelete('chains', null, {});
    }
};
