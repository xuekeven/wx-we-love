const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Menstrual = sequelize.define('Menstrual', {
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
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  cycleLength: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  symptoms: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Menstrual;
