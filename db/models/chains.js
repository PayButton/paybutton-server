'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class chains extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        chains.addresses = chains.hasMany(models.paybuttons_addresses, { as: 'addresses' });
    }
  }
  chains.init({
    slug: DataTypes.STRING,
    title: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'chains',
  });
  return chains;
};
