'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class paybutton_addresses extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        paybutton_addresses.paybutton = paybutton_addresses.belongsTo(models.paybuttons, { as: 'paybutton', allowNull: false, onDelete: 'CASCADE'})
        paybutton_addresses.chain = paybutton_addresses.belongsTo(models.chains, { as: 'chain', allowNull: false, onDelete: 'RESTRICT'})
    }
  }
  paybutton_addresses.init({
    address: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'paybutton_addresses',
  });
  return paybutton_addresses;
};
