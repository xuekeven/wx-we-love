const sequelize = require('../config/database');
const User = require('./User');
const Anniversary = require('./Anniversary');
const Menstrual = require('./Menstrual');
const MoodDiary = require('./MoodDiary');

// 这里可以定义关联关系，如果需要的话

module.exports = {
  sequelize,
  User,
  Anniversary,
  Menstrual,
  MoodDiary
};

