const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Couple = sequelize.define('Couple', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'active'
  },
  loveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Couple;
