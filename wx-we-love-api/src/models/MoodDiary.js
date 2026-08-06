const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MoodDiary = sequelize.define('MoodDiary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户 id'
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '创建时所属情侣关系 id'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '日记日期 YYYY-MM-DD'
  },
  moodId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '心情 id，如 angry, happy'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '日记正文'
  },
  readByMatchedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '匹配对象阅读时间，null 表示未读'
  }
});

module.exports = MoodDiary;
