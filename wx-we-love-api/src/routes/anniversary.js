const express = require('express');
const router = express.Router();
const { Anniversary } = require('../models');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

function isValidDateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePayload(body) {
  const { title, date, type, isYearly, reminder } = body;
  return {
    title: typeof title === 'string' ? title.trim() : '',
    date,
    type: type || 'custom',
    isYearly: isYearly !== undefined ? !!isYearly : true,
    reminder: reminder !== undefined ? !!reminder : true
  };
}

function validatePayload(data) {
  if (!data.title) return '请填写纪念日标题';
  if (!isValidDateOnly(data.date)) return '请提供有效的纪念日日期';
  return null;
}

// 获取纪念日列表
router.get('/', async (req, res) => {
  try {
    const anniversaries = await Anniversary.findAll({
      where: { userId: req.userId },
      order: [['date', 'ASC']]
    });
    res.json({
      success: true,
      data: anniversaries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加纪念日
router.post('/', async (req, res) => {
  try {
    const data = normalizePayload(req.body);
    const validationMessage = validatePayload(data);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const newAnniversary = await Anniversary.create({
      userId: req.userId,
      ...data
    });
    res.json({
      success: true,
      message: '添加成功',
      data: newAnniversary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除纪念日
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Anniversary.destroy({
      where: { id, userId: req.userId }
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: '纪念日不存在' });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
