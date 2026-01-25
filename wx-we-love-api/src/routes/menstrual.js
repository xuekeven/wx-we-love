const express = require('express');
const router = express.Router();
const { Menstrual } = require('../models');
const { Op } = require('sequelize');

// 获取经期记录列表
router.get('/', async (req, res) => {
  try {
    const records = await Menstrual.findAll({
      order: [['startDate', 'DESC']]
    });
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取单条记录
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Menstrual.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加经期记录
router.post('/', async (req, res) => {
  try {
    const { startDate, endDate, symptoms, note } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ success: false, message: '请提供开始日期' });
    }

    // 计算周期长度
    let cycleLength = null;
    const lastRecord = await Menstrual.findOne({
      order: [['startDate', 'DESC']]
    });
    
    if (lastRecord) {
      const lastDate = new Date(lastRecord.startDate);
      const currentDate = new Date(startDate);
      cycleLength = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
    }

    const newRecord = await Menstrual.create({
      startDate, endDate, cycleLength, symptoms, note
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

// 更新经期记录
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, symptoms, note } = req.body;
    
    const record = await Menstrual.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    
    await record.update({ startDate, endDate, symptoms, note });
    
    res.json({
      success: true,
      message: '更新成功',
      data: record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除经期记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Menstrual.destroy({ where: { id } });
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

// 获取统计信息
router.get('/stats/cycle', async (req, res) => {
  try {
    const records = await Menstrual.findAll({
      order: [['startDate', 'ASC']]
    });

    if (records.length < 2) {
      return res.json({
        success: true,
        data: { averageCycle: 28, recordCount: records.length }
      });
    }

    const cycles = [];
    for (let i = 0; i < records.length - 1; i++) {
      const current = new Date(records[i].startDate);
      const next = new Date(records[i + 1].startDate);
      const days = Math.round((next - current) / (1000 * 60 * 60 * 24));
      if (days > 0 && days < 60) {
        cycles.push(days);
      }
    }

    const averageCycle = cycles.length > 0 
      ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
      : 28;

    res.json({
      success: true,
      data: { averageCycle, recordCount: records.length, cycles }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
