const express = require('express');
const { Moment, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const { getRequestMembership } = require('../services/couple');
const { normalizeUrl } = require('../utils/url');
const { validateOptionalText } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { couple } = await getRequestMembership(req);
    if (!couple) return res.json({ success: true, data: [] });
    const moments = await Moment.findAll({ where: { coupleId: couple.id }, order: [['occurredAt', 'DESC'], ['createdAt', 'DESC']], limit: 200 });
    const users = await User.findAll({ where: { coupleId: couple.id }, attributes: ['id', 'currentName', 'currentAvatar'] });
    const userMap = new Map(users.map((user) => [user.id, user]));
    res.json({ success: true, data: moments.map((moment) => ({
      ...moment.toJSON(),
      isBySelf: moment.userId === req.userId,
      authorName: userMap.get(moment.userId)?.currentName || '未知',
      authorAvatar: normalizeUrl(userMap.get(moment.userId)?.currentAvatar || ''),
      imageUrl: normalizeUrl(moment.imageUrl || '')
    })) });
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
    const moment = await Moment.create({
      coupleId: couple.id,
      userId: req.userId,
      content: content.value,
      imageUrl: imageUrl.value || null,
      location: location.value || null,
      occurredAt
    });
    res.status(201).json({ success: true, message: '已记录', data: moment });
  } catch (error) {
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
