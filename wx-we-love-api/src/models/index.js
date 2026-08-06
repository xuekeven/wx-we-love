const sequelize = require('../config/database');
const User = require('./User');
const Anniversary = require('./Anniversary');
const Menstrual = require('./Menstrual');
const MoodDiary = require('./MoodDiary');
const MoodDiaryComment = require('./MoodDiaryComment');
const Couple = require('./Couple');
const Moment = require('./Moment');

User.belongsTo(Couple, { foreignKey: 'coupleId', as: 'couple' });
Couple.hasMany(User, { foreignKey: 'coupleId', as: 'members' });

module.exports = {
  sequelize,
  User,
  Anniversary,
  Menstrual,
  MoodDiary,
  MoodDiaryComment,
  Couple,
  Moment
};
