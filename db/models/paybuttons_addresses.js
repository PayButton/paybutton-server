'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class paybuttons_addresses extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  paybuttons_addresses.init({
    address: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'paybuttons_addresses',
  });
  return paybuttons_addresses;
};
