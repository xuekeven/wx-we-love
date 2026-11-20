const express = require('express');
const { Op } = require('sequelize');
const { Moment, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const { getRequestMembership } = require('../services/couple');
const { withUploadReference } = require('../services/uploads');
const { normalizeUrl } = require('../utils/url');
const { validateOptionalText } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

function encodeCursor(moment) {
  return Buffer.from(JSON.stringify([moment.occurredAt, moment.createdAt, moment.id])).toString('base64url');
}

function decodeCursor(value) {
  if (typeof value !== 'string' || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const tuple = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!Array.isArray(tuple) || tuple.length !== 3 || tuple.some((part) => typeof part !== 'string')) return null;
    const [occurred, created, id] = tuple;
    const occurredAt = new Date(occurred);
    const createdAt = new Date(created);
    if (occurredAt.toJSON() !== occurred || createdAt.toJSON() !== created
      || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
    return { occurredAt, createdAt, id };
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  const { limit, cursor } = req.query;
  const paginated = limit !== undefined || cursor !== undefined;
  const pageSize = limit === undefined ? 5 : Number(limit);
  if (limit !== undefined && (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || pageSize > 50)) {
    return res.status(400).json({ success: false, message: '分页条数无效' });
  }
  const before = cursor === undefined ? null : decodeCursor(cursor);
  if (cursor !== undefined && !before) {
    return res.status(400).json({ success: false, message: '分页游标无效' });
  }

  try {
    const { couple } = await getRequestMembership(req);
    if (!couple) {
      return res.json({ success: true, data: paginated ? { items: [], nextCursor: null } : [] });
    }
    const where = { coupleId: couple.id };
    if (before) {
      const { occurredAt, createdAt, id } = before;
      where[Op.or] = [
        { occurredAt: { [Op.lt]: occurredAt } },
        { occurredAt, createdAt: { [Op.lt]: createdAt } },
        { occurredAt, createdAt, id: { [Op.lt]: id } }
      ];
    }
    const rows = await Moment.findAll({
      where,
      order: [['occurredAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
      limit: paginated ? pageSize + 1 : 200
    });
    const hasMore = paginated && rows.length > pageSize;
    const moments = hasMore ? rows.slice(0, pageSize) : rows;
    const users = moments.length
      ? await User.findAll({ where: { coupleId: couple.id }, attributes: ['id', 'currentName', 'currentAvatar'] })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const items = moments.map((moment) => ({
      ...moment.toJSON(),
      isBySelf: moment.userId === req.userId,
      authorName: userMap.get(moment.userId)?.currentName || '未知',
      authorAvatar: normalizeUrl(userMap.get(moment.userId)?.currentAvatar || ''),
      imageUrl: normalizeUrl(moment.imageUrl || '')
    }));
    const data = paginated
      ? { items, nextCursor: hasMore ? encodeCursor(moments.at(-1)) : null }
      : items;
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取瞬间失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { couple } = await getRequestMembership(req);
    if (!couple) return res.status(409).json({ success: false, message: '请先完成匹配' });
    const content = validateOptionalText(req.body?.content, 1000);
    const imageUrl = validateOptionalText(req.body?.imageUrl, 2048);
    const location = validateOptionalText(req.body?.location, 120);
    const occurredAt = req.body?.occurredAt ? new Date(req.body.occurredAt) : new Date();
    if (content.error) return res.status(400).json({ success: false, message: '内容不能超过 1000 个字符' });
    if (imageUrl.error) return res.status(400).json({ success: false, message: '图片地址过长' });
    if (location.error) return res.status(400).json({ success: false, message: '位置不能超过 120 个字符' });
    if (!content.value) return res.status(400).json({ success: false, message: '请填写内容' });
    if (imageUrl.value && !/^https:\/\//i.test(imageUrl.value)) return res.status(400).json({ success: false, message: '图片地址必须使用 HTTPS' });
    if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date()) return res.status(400).json({ success: false, message: '发生时间无效' });
    const moment = await withUploadReference(imageUrl.value, () => Moment.create({
      coupleId: couple.id,
      userId: req.userId,
      content: content.value,
      imageUrl: imageUrl.value || null,
      location: location.value || null,
      occurredAt
    }));
    res.status(201).json({ success: true, message: '已记录', data: moment });
  } catch (error) {
    if (error.code === 'UPLOAD_EXPIRED') {
      return res.status(410).json({ success: false, message: error.message });
    }
    console.error('记录瞬间失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Moment.destroy({ where: { id: req.params.id, userId: req.userId } });
    if (!deleted) return res.status(404).json({ success: false, message: '瞬间不存在或无权删除' });
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('删除瞬间失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
