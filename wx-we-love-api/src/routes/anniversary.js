const express = require('express');
const { Anniversary } = require('../models');
const authMiddleware = require('../middleware/auth');
const { getActiveMembership } = require('../services/couple');
const { isValidDateOnly, validateOptionalText } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

function normalizePayload(body) {
  const title = validateOptionalText(body?.title, 80);
  return {
    error: title.error ? '纪念日标题不能超过 80 个字符' : null,
    title: title.value,
    date: body?.date,
    type: ['birthday', 'anniversary', 'custom'].includes(body?.type) ? body.type : 'custom',
    isYearly: body?.isYearly !== undefined ? Boolean(body.isYearly) : true,
    reminder: body?.reminder !== undefined ? Boolean(body.reminder) : true
  };
}

function validatePayload(data) {
  if (data.error) return data.error;
  if (!data.title) return '请填写纪念日标题';
  if (!isValidDateOnly(data.date)) return '请提供有效的纪念日日期';
  return null;
}

async function accessScope(userId) {
  const { couple } = await getActiveMembership(userId);
  return couple ? { coupleId: couple.id } : { userId, coupleId: null };
}

router.get('/', async (req, res) => {
  try {
    const anniversaries = await Anniversary.findAll({
      where: await accessScope(req.userId),
      order: [['date', 'ASC']]
    });
    res.json({ success: true, data: anniversaries });
  } catch (error) {
    console.error('获取纪念日失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = normalizePayload(req.body);
    const validationMessage = validatePayload(data);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });
    delete data.error;
    const { couple } = await getActiveMembership(req.userId);
    const anniversary = await Anniversary.create({ userId: req.userId, coupleId: couple?.id || null, ...data });
    res.status(201).json({ success: true, message: '添加成功', data: anniversary });
  } catch (error) {
    console.error('添加纪念日失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = normalizePayload(req.body);
    const validationMessage = validatePayload(data);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });
    delete data.error;
    const anniversary = await Anniversary.findOne({ where: { id: req.params.id, ...(await accessScope(req.userId)) } });
    if (!anniversary) return res.status(404).json({ success: false, message: '纪念日不存在' });
    await anniversary.update(data);
    res.json({ success: true, message: '更新成功', data: anniversary });
  } catch (error) {
    console.error('更新纪念日失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Anniversary.destroy({ where: { id: req.params.id, ...(await accessScope(req.userId)) } });
    if (!deleted) return res.status(404).json({ success: false, message: '纪念日不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除纪念日失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
