const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Anniversary = sequelize.define('Anniversary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '用户 id'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'custom'
  },
  isYearly: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Anniversary;
