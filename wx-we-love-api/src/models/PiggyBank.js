const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PiggyBank = sequelize.define('PiggyBank', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    defaultValue: 'income'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = PiggyBank;

