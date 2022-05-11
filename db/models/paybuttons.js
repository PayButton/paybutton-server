'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class paybuttons extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      paybuttons.addresses = paybuttons.hasMany(models.paybuttons_addresses, { as: 'addresses' })
    }
  }
  paybuttons.init({
    providerUserId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'paybuttons',
  });
  return paybuttons;
};
