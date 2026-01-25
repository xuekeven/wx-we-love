const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DateRecord = sequelize.define('DateRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photos: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  }
});

module.exports = DateRecord;

