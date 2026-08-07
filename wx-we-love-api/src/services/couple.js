const { Op } = require('sequelize');
const { Couple, User } = require('../models');

async function getActiveMembership(userId, options = {}) {
  const suppliedUser = options.user;
  const user = suppliedUser && Number(suppliedUser.id) === Number(userId)
    ? suppliedUser
    : await User.findByPk(userId, {
        attributes: ['id', 'coupleId', 'matchedUserId', 'isMatched'],
        transaction: options.transaction,
        lock: options.lock
      });
  if (!user?.coupleId) return { user, couple: null, partner: null };

  const findCouple = () => Couple.findOne({
    where: { id: user.coupleId, status: 'active' },
    transaction: options.transaction,
    lock: options.lock
  });
  const findPartner = () => User.findOne({
    where: { coupleId: user.coupleId, id: { [Op.ne]: userId } },
    attributes: ['id', 'currentName', 'currentAvatar'],
    transaction: options.transaction,
    lock: options.lock
  });

  // A transaction must not issue concurrent statements on its single
  // connection. Ordinary reads can run together to reduce round trips.
  if (options.transaction) {
    const couple = await findCouple();
    if (!couple) return { user, couple: null, partner: null };
    return {
      user,
      couple,
      partner: await findPartner()
    };
  }

  const [couple, partner] = await Promise.all([findCouple(), findPartner()]);
  if (!couple) return { user, couple: null, partner: null };
  return { user, couple, partner };
}

function getRequestMembership(req) {
  if (!req.activeMembershipPromise) {
    req.activeMembershipPromise = getActiveMembership(req.userId, { user: req.authUser });
  }
  return req.activeMembershipPromise;
}

module.exports = { getActiveMembership, getRequestMembership };
