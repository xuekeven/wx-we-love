const express = require('express');
const router = express.Router();
const { Anniversary } = require('../models');

// 获取纪念日列表
router.get('/', async (req, res) => {
  try {
    const anniversaries = await Anniversary.findAll({
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
    const { title, date, type, isYearly, reminder } = req.body;
    const newAnniversary = await Anniversary.create({
      title, date, type, isYearly, reminder
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
    const deleted = await Anniversary.destroy({ where: { id } });
    
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
