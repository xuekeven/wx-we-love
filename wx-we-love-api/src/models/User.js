const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  loveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  name1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar1: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar2: {
    type: DataTypes.STRING,
    allowNull: true
  },
  functionOrder: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
    }
  }
});

module.exports = User;

