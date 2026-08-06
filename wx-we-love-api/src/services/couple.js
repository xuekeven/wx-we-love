const { Op } = require('sequelize');
const { Couple, User } = require('../models');

async function getActiveMembership(userId, options = {}) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'coupleId', 'matchedUserId', 'isMatched'],
    transaction: options.transaction,
    lock: options.lock
  });
  if (!user?.coupleId) return { user, couple: null, partner: null };

  const couple = await Couple.findOne({
    where: { id: user.coupleId, status: 'active' },
    transaction: options.transaction,
    lock: options.lock
  });
  if (!couple) return { user, couple: null, partner: null };

  const partner = await User.findOne({
    where: { coupleId: couple.id, id: { [Op.ne]: userId } },
    transaction: options.transaction,
    lock: options.lock
  });
  return { user, couple, partner };
}

module.exports = { getActiveMembership };
