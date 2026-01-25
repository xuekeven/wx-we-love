const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Menstrual = sequelize.define('Menstrual', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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

