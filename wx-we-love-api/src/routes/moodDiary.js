const express = require('express');
const router = express.Router();
const { MoodDiary } = require('../models');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

// 获取某月心情日记列表（按用户）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.userId;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: '缺少 year 或 month 参数' });
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'year/month 无效' });
    }
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const list = await MoodDiary.findAll({
      where: {
        userId,
        date: { [Op.between]: [start, end] }
      },
      order: [['date', 'ASC']]
    });
    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 保存一条心情日记（同一天同用户会覆盖）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, moodId, content } = req.body;
    const userId = req.userId;
    if (!date || !moodId) {
      return res.status(400).json({ success: false, message: '缺少 date 或 moodId' });
    }
    const existing = await MoodDiary.findOne({
      where: { userId, date }
    });
    if (existing) {
      await existing.update({ moodId, content: content || null });
      return res.json({
        success: true,
        message: '更新成功',
        data: existing
      });
    }
    const row = await MoodDiary.create({
      userId,
      date,
      moodId,
      content: content || null
    });
    res.json({
      success: true,
      message: '保存成功',
      data: row
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
