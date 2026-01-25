const sequelize = require('../config/database');
const User = require('./User');
const Wishlist = require('./Wishlist');
const Anniversary = require('./Anniversary');
const Note = require('./Note');
const DateRecord = require('./DateRecord');
const PiggyBank = require('./PiggyBank');
const Menstrual = require('./Menstrual');
const Schedule = require('./Schedule');

// 这里可以定义关联关系，如果需要的话
// 例如：User.hasMany(Wishlist); Wishlist.belongsTo(User);

module.exports = {
  sequelize,
  User,
  Wishlist,
  Anniversary,
  Note,
  DateRecord,
  PiggyBank,
  Menstrual,
  Schedule
};

