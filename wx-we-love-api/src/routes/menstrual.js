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

// 重新计算所有记录的周期
async function recalculateCycles() {
  try {
    // 获取所有记录，按开始日期升序排序
    const allRecords = await Menstrual.findAll({
      order: [['startDate', 'ASC']]
    });

    // 重新计算每条记录的周期
    for (let i = 0; i < allRecords.length; i++) {
      let cycleLength = null;
      
      // 找到当前记录之前最近的一条记录（按日期）
      if (i > 0) {
        const prevRecord = allRecords[i - 1];
        const prevDate = new Date(prevRecord.startDate);
        const currentDate = new Date(allRecords[i].startDate);
        const daysDiff = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
        
        // 只保存合理的周期（15-60天之间）
        if (daysDiff > 0 && daysDiff <= 60) {
          cycleLength = daysDiff;
        }
      }
      
      // 更新记录的周期
      await allRecords[i].update({ cycleLength });
    }
  } catch (error) {
    console.error('重新计算周期失败:', error);
  }
}

// 添加经期记录
router.post('/', async (req, res) => {
  try {
    const { startDate, endDate, symptoms, note } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ success: false, message: '请提供开始日期' });
    }

    const newRecord = await Menstrual.create({
      startDate, endDate, cycleLength: null, symptoms, note
    });

    // 添加记录后，重新计算所有记录的周期
    await recalculateCycles();

    // 重新获取更新后的记录
    const updatedRecord = await Menstrual.findByPk(newRecord.id);

    res.json({
      success: true,
      message: '添加成功',
      data: updatedRecord
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
    
    // 更新记录后，重新计算所有记录的周期
    await recalculateCycles();
    
    // 重新获取更新后的记录
    const updatedRecord = await Menstrual.findByPk(id);
    
    res.json({
      success: true,
      message: '更新成功',
      data: updatedRecord
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
    
    // 删除记录后，重新计算所有记录的周期
    await recalculateCycles();
    
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
