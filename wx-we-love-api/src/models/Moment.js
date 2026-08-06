const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Moment = sequelize.define('Moment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Moment;
