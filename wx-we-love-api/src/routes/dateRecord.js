const express = require('express');
const router = express.Router();
const { DateRecord } = require('../models');

// 获取约会记录
router.get('/', async (req, res) => {
  try {
    const records = await DateRecord.findAll({
      order: [['date', 'DESC']]
    });
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加约会记录
router.post('/', async (req, res) => {
  try {
    const { title, date, location, description, photos, rating } = req.body;
    const newRecord = await DateRecord.create({
      title, date, location, description, photos, rating
    });
    res.json({
      success: true,
      message: '添加成功',
      data: newRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除约会记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DateRecord.destroy({ where: { id } });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: '记录不存在' });
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
