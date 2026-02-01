const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MoodDiaryComment = sequelize.define('MoodDiaryComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moodDiaryId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '心情日记 id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '评论者 id'
  },
  content: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '评论内容'
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = MoodDiaryComment;
