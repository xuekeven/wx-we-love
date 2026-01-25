const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  openId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '微信openId'
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '用户昵称'
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '用户头像'
  },
  matchCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: '匹配码'
  },
  matchedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '匹配的用户ID',
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isMatched: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已匹配'
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

