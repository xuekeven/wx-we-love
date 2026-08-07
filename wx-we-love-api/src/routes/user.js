const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Op, Transaction } = require('sequelize');
const { getJwtSecret } = require('../config/env');
const authMiddleware = require('../middleware/auth');
const { createRateLimit } = require('../middleware/rateLimit');
const {
  sequelize,
  User,
  Couple,
  Anniversary,
  Menstrual,
  MoodDiary,
  MoodDiaryComment,
  Moment
} = require('../models');
const { getActiveMembership, getRequestMembership } = require('../services/couple');
const { getPhoneNumber, getSessionByCode } = require('../services/wechat');
const { deleteUserUploads } = require('../services/uploads');
const { normalizeUrl } = require('../utils/url');
const {
  isValidDateOnly,
  normalizeOptionalText,
  parseDateOnly,
  validateOptionalText
} = require('../utils/validation');

const router = express.Router();
const MATCH_CODE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_FUNCTION_ORDER = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6 };

const loginRateLimit = createRateLimit({ name: 'login', windowMs: 10 * 60 * 1000, max: 20 });
const matchRateLimit = createRateLimit({
  name: 'match',
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => String(req.userId)
});

function createMatchCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function issueMatchCode(user, transaction) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const matchCode = createMatchCode();
    const exists = await User.findOne({ where: { matchCode }, attributes: ['id'], transaction });
    if (exists) continue;
    const matchCodeExpiresAt = new Date(Date.now() + MATCH_CODE_TTL_MS);
    await user.update({ matchCode, matchCodeExpiresAt }, { transaction });
    return { matchCode, matchCodeExpiresAt };
  }
  throw new Error('无法生成唯一匹配码');
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    getJwtSecret(),
    { expiresIn: '30d', issuer: 'wx-we-love-api', audience: 'wx-we-love-app' }
  );
}

function validateProfileUpdate(body) {
  const updates = {};
  if (body.currentName !== undefined) {
    const name = validateOptionalText(body.currentName, 24);
    if (name.error) return { error: '姓名不能超过 24 个字符' };
    if (!name.value) return { error: '姓名不能为空' };
    updates.currentName = name.value;
  }
  if (body.currentAvatar !== undefined) {
    const avatar = validateOptionalText(body.currentAvatar, 2048);
    if (avatar.error) return { error: '头像地址过长' };
    if (avatar.value && !/^https:\/\//i.test(avatar.value)) return { error: '头像地址必须使用 HTTPS' };
    updates.currentAvatar = avatar.value;
  }
  if (body.loveDate !== undefined) {
    if (body.loveDate !== null && (!isValidDateOnly(body.loveDate) || parseDateOnly(body.loveDate) > new Date())) {
      return { error: '恋爱纪念日无效' };
    }
    updates.loveDate = body.loveDate;
  }
  if (body.functionOrder !== undefined) {
    const order = body.functionOrder;
    if (!order || typeof order !== 'object' || Array.isArray(order) || Object.keys(order).length > 20
      || Object.values(order).some((value) => !Number.isInteger(value))) {
      return { error: '功能排序格式无效' };
    }
    updates.functionOrder = order;
  }
  return { updates };
}

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { code, uuid } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, message: '缺少 code 参数' });
    }
    const { openId } = await getSessionByCode(code.trim());
    if (!openId) return res.status(400).json({ success: false, message: '获取用户标识失败' });

    let user = await User.findOne({ where: { openId } });
    if (!user) {
      user = await sequelize.transaction(async (transaction) => {
        const created = await User.create({
          openId,
          uuid: normalizeOptionalText(uuid, 32) || null,
          currentName: '微信用户',
          currentAvatar: '',
          isMatched: false,
          functionOrder: DEFAULT_FUNCTION_ORDER
        }, { transaction });
        await issueMatchCode(created, transaction);
        return created;
      });
    } else {
      await user.update({
        uuid: normalizeOptionalText(uuid, 32) || user.uuid,
        sessionKey: null
      });
      if (!user.coupleId && (!user.matchCodeExpiresAt || user.matchCodeExpiresAt <= new Date())) {
        await issueMatchCode(user);
      }
    }

    const membership = await getActiveMembership(user.id, { user });
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          currentName: user.currentName,
          currentAvatar: normalizeUrl(user.currentAvatar),
          phone: user.phone,
          matchCode: membership.couple ? null : user.matchCode,
          matchCodeExpiresAt: membership.couple ? null : user.matchCodeExpiresAt,
          isMatched: !!membership.couple,
          matchedUserId: membership.partner?.id || null
        },
        token: signToken(user)
      }
    });
  } catch (error) {
    console.error('登录失败:', error.message);
    res.status(error.code === 'CONFIGURATION_ERROR' ? 503 : 502).json({
      success: false,
      message: error.code === 'CONFIGURATION_ERROR' ? '服务配置错误' : '微信登录失败，请重试'
    });
  }
});

router.use(authMiddleware);

router.get('/info', async (req, res) => {
  try {
    const user = req.authUser || await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    const { couple, partner } = await getRequestMembership(req);
    res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        matchCode: couple ? null : user.matchCode,
        matchCodeExpiresAt: couple ? null : user.matchCodeExpiresAt,
        isMatched: !!couple,
        matchedUserId: partner?.id || null,
        currentName: user.currentName || '',
        currentAvatar: normalizeUrl(user.currentAvatar || ''),
        matchedName: partner?.currentName || '',
        matchedAvatar: normalizeUrl(partner?.currentAvatar || ''),
        matchedUser: partner ? { id: partner.id } : null,
        loveDate: couple?.loveDate || user.loveDate,
        functionOrder: user.functionOrder
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/generate-match-code', matchRateLimit, async (req, res) => {
  try {
    const user = req.authUser || await User.findByPk(req.userId);
    const membership = await getRequestMembership(req);
    if (membership.couple) return res.status(409).json({ success: false, message: '已经匹配' });
    const code = await issueMatchCode(user);
    res.json({ success: true, message: '匹配码生成成功', data: code });
  } catch (error) {
    console.error('生成匹配码失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/match', matchRateLimit, async (req, res) => {
  const matchCode = String(req.body?.matchCode || '').trim();
  if (!/^\d{6}$/.test(matchCode)) {
    return res.status(400).json({ success: false, message: '请输入有效的 6 位匹配码' });
  }

  try {
    const result = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
      const currentUser = await User.findByPk(req.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!currentUser) return { status: 404, message: '用户不存在' };
      if (currentUser.coupleId || currentUser.isMatched) return { status: 409, message: '已经匹配' };
      if (currentUser.matchCode === matchCode) return { status: 400, message: '不能使用自己的匹配码' };

      const targetUser = await User.findOne({
        where: { matchCode, matchCodeExpiresAt: { [Op.gt]: new Date() } },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!targetUser) return { status: 404, message: '匹配码不存在或已过期' };
      if (targetUser.coupleId || targetUser.isMatched) return { status: 409, message: '该用户已经匹配' };

      const couple = await Couple.create({ loveDate: currentUser.loveDate || targetUser.loveDate || null }, { transaction });
      await currentUser.update({
        coupleId: couple.id,
        isMatched: true,
        matchedUserId: targetUser.id,
        matchCode: null,
        matchCodeExpiresAt: null
      }, { transaction });
      await targetUser.update({
        coupleId: couple.id,
        isMatched: true,
        matchedUserId: currentUser.id,
        matchCode: null,
        matchCodeExpiresAt: null
      }, { transaction });
      return { targetUser };
    });

    if (result.status) return res.status(result.status).json({ success: false, message: result.message });
    res.json({
      success: true,
      message: '匹配成功',
      data: {
        matchedUser: {
          id: result.targetUser.id,
          currentName: result.targetUser.currentName,
          currentAvatar: normalizeUrl(result.targetUser.currentAvatar)
        }
      }
    });
  } catch (error) {
    console.error('匹配失败:', error);
    res.status(409).json({ success: false, message: '匹配状态已变化，请刷新后重试' });
  }
});

router.post('/info', async (req, res) => {
  const { updates, error } = validateProfileUpdate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const user = await sequelize.transaction(async (transaction) => {
      const current = await User.findByPk(req.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!current) return null;
      const userUpdates = { ...updates };
      delete userUpdates.loveDate;
      await current.update(userUpdates, { transaction });

      if (Object.prototype.hasOwnProperty.call(updates, 'loveDate')) {
        const { couple } = await getActiveMembership(current.id, { user: current, transaction, lock: transaction.LOCK.UPDATE });
        if (couple) {
          await couple.update({ loveDate: updates.loveDate }, { transaction });
          await User.update({ loveDate: updates.loveDate }, { where: { coupleId: couple.id }, transaction });
        } else {
          await current.update({ loveDate: updates.loveDate }, { transaction });
        }
      }
      return current;
    });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    const { couple } = await getActiveMembership(user.id, { user });
    res.json({
      success: true,
      message: '更新成功',
      data: {
        currentName: user.currentName,
        currentAvatar: normalizeUrl(user.currentAvatar),
        loveDate: couple?.loveDate || user.loveDate,
        functionOrder: user.functionOrder
      }
    });
  } catch (caught) {
    console.error('更新用户信息失败:', caught);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/function-order', async (req, res) => {
  const { updates, error } = validateProfileUpdate({ functionOrder: req.body?.functionOrder });
  if (error) return res.status(400).json({ success: false, message: error });
  await User.update(updates, { where: { id: req.userId } });
  res.json({ success: true, message: '排序已更新', data: updates.functionOrder });
});

router.post('/bind-phone', async (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!code) return res.status(400).json({ success: false, message: '缺少手机号授权 code' });
  try {
    const phone = await getPhoneNumber(code);
    if (!phone) return res.status(400).json({ success: false, message: '获取手机号失败' });
    await User.update({ phone }, { where: { id: req.userId } });
    res.json({ success: true, message: '手机号绑定成功', data: { phone } });
  } catch (error) {
    console.error('绑定手机号失败:', error.message);
    res.status(502).json({ success: false, message: '获取手机号失败，请重试' });
  }
});

router.post('/logout', async (req, res) => {
  await User.increment('tokenVersion', { by: 1, where: { id: req.userId } });
  res.json({ success: true, message: '已退出登录' });
});

async function endRelationship(currentUser, transaction) {
  let members = [currentUser];
  if (currentUser.coupleId) {
    members = await User.findAll({
      where: { coupleId: currentUser.coupleId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
  } else if (currentUser.matchedUserId) {
    const legacyPartner = await User.findOne({
      where: {
        id: currentUser.matchedUserId,
        matchedUserId: currentUser.id,
        isMatched: true
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (legacyPartner) members.push(legacyPartner);
  }

  if (currentUser.coupleId) {
    await Couple.update(
      { status: 'ended', endedAt: new Date() },
      { where: { id: currentUser.coupleId, status: 'active' }, transaction }
    );
  }

  for (const member of members) {
    await member.update({
      coupleId: null,
      isMatched: false,
      matchedUserId: null,
      loveDate: null,
      functionOrder: DEFAULT_FUNCTION_ORDER
    }, { transaction });
    await issueMatchCode(member, transaction);
  }
  return members.find((member) => member.id !== currentUser.id) || null;
}

router.post('/unmatch', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const currentUser = await User.findByPk(req.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!currentUser) return { status: 404, message: '用户不存在' };
      if (!currentUser.coupleId && !currentUser.isMatched) return { status: 409, message: '当前未匹配' };
      await endRelationship(currentUser, transaction);
      return {};
    });
    if (result.status) return res.status(result.status).json({ success: false, message: result.message });
    res.json({ success: true, message: '解绑成功，历史数据已保留', data: { isMatched: false, matchedUserId: null } });
  } catch (error) {
    console.error('解绑失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/export-data', async (req, res) => {
  try {
    const [user, anniversaries, menstrual, diaries, comments, moments] = await Promise.all([
      User.findByPk(req.userId, { attributes: { exclude: ['sessionKey', 'tokenVersion'] } }),
      Anniversary.findAll({ where: { userId: req.userId } }),
      Menstrual.findAll({ where: { userId: req.userId } }),
      MoodDiary.findAll({ where: { userId: req.userId } }),
      MoodDiaryComment.findAll({ where: { userId: req.userId } }),
      Moment.findAll({ where: { userId: req.userId } })
    ]);
    res.json({
      success: true,
      data: { exportedAt: new Date().toISOString(), user, anniversaries, menstrual, diaries, comments, moments }
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/delete-account', async (req, res) => {
  if (req.body?.confirmation !== 'DELETE') {
    return res.status(400).json({ success: false, message: '请确认删除账号' });
  }
  try {
    await deleteUserUploads(req.userId);
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return;
      if (user.coupleId || user.isMatched) await endRelationship(user, transaction);
      const diaries = await MoodDiary.findAll({ where: { userId: user.id }, attributes: ['id'], transaction });
      const diaryIds = diaries.map((diary) => diary.id);
      if (diaryIds.length) {
        await MoodDiaryComment.destroy({ where: { moodDiaryId: { [Op.in]: diaryIds } }, transaction });
      }
      await MoodDiaryComment.destroy({ where: { userId: user.id }, transaction });
      await Promise.all([
        Anniversary.destroy({ where: { userId: user.id }, transaction }),
        Menstrual.destroy({ where: { userId: user.id }, transaction }),
        MoodDiary.destroy({ where: { userId: user.id }, transaction }),
        Moment.destroy({ where: { userId: user.id }, transaction })
      ]);
      await user.destroy({ transaction });
    });
    res.json({ success: true, message: '账号及个人数据已删除' });
  } catch (error) {
    console.error('删除账号失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
