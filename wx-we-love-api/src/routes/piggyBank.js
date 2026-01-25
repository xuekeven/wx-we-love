const express = require('express');
const router = express.Router();
const { PiggyBank } = require('../models');

// 获取存钱罐记录
router.get('/', async (req, res) => {
  try {
    const records = await PiggyBank.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加记录
router.post('/', async (req, res) => {
  try {
    const { amount, type, category, description } = req.body;
    const newRecord = await PiggyBank.create({
      amount: parseFloat(amount),
      type,
      category,
      description
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

// 删除记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PiggyBank.destroy({ where: { id } });
    
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
