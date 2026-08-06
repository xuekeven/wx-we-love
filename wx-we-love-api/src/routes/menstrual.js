const express = require('express');
const router = express.Router();
const { Menstrual } = require('../models');
const authMiddleware = require('../middleware/auth');
const {
  daysBetween,
  isValidDateOnly,
  parseDateOnly,
  todayDateOnly,
  validateOptionalText
} = require('../utils/validation');

router.use(authMiddleware);

function normalizePayload(body = {}) {
  const { startDate, endDate, symptoms, note } = body;
  if (symptoms !== undefined && !Array.isArray(symptoms)) return { error: '症状格式无效' };
  if (Array.isArray(symptoms) && symptoms.length > 20) return { error: '症状不能超过 20 项' };
  const normalizedSymptoms = [];
  for (const item of symptoms || []) {
    const symptom = validateOptionalText(item, 30);
    if (symptom.error) return { error: '单项症状不能超过 30 个字符' };
    if (symptom.value) normalizedSymptoms.push(symptom.value);
  }
  const normalizedNote = validateOptionalText(note, 1000);
  if (normalizedNote.error) return { error: '备注不能超过 1000 个字符' };
  return {
    startDate,
    endDate: endDate || null,
    symptoms: [...new Set(normalizedSymptoms)],
    note: normalizedNote.value
  };
}

function validatePayload(data) {
  if (data.error) return data.error;
  if (!isValidDateOnly(data.startDate)) {
    return '请提供有效的开始日期';
  }
  if (data.endDate && !isValidDateOnly(data.endDate)) {
    return '请提供有效的结束日期';
  }
  if (data.endDate && parseDateOnly(data.endDate) < parseDateOnly(data.startDate)) {
    return '结束日期不能早于开始日期';
  }
  if (parseDateOnly(data.startDate) > parseDateOnly(todayDateOnly())) {
    return '开始日期不能晚于今天';
  }
  return null;
}

// 重新计算当前用户所有记录的周期
async function recalculateCycles(userId) {
  try {
    const allRecords = await Menstrual.findAll({
      where: { userId },
      order: [['startDate', 'ASC']]
    });

    for (let i = 0; i < allRecords.length; i++) {
      let cycleLength = null;
      if (i > 0) {
        const daysDiff = daysBetween(allRecords[i - 1].startDate, allRecords[i].startDate);
        if (daysDiff >= 15 && daysDiff <= 60) {
          cycleLength = daysDiff;
        }
      }
      await allRecords[i].update({ cycleLength });
    }
  } catch (error) {
    console.error('重新计算周期失败:', error);
  }
}

// 获取经期记录列表
router.get('/', async (req, res) => {
  try {
    const records = await Menstrual.findAll({
      where: { userId: req.userId },
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

// 获取统计信息
router.get('/stats/cycle', async (req, res) => {
  try {
    const records = await Menstrual.findAll({
      where: { userId: req.userId },
      order: [['startDate', 'ASC']]
    });

    if (records.length < 2) {
      return res.json({
        success: true,
        data: { averageCycle: 28, recordCount: records.length, cycles: [] }
      });
    }

    const cycles = [];
    for (let i = 0; i < records.length - 1; i++) {
      const days = daysBetween(records[i].startDate, records[i + 1].startDate);
      if (days >= 15 && days <= 60) {
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

// 获取单条记录
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Menstrual.findOne({
      where: { id, userId: req.userId }
    });
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
    const data = normalizePayload(req.body);
    const validationMessage = validatePayload(data);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const newRecord = await Menstrual.create({
      userId: req.userId,
      ...data,
      cycleLength: null
    });

    await recalculateCycles(req.userId);

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
    const data = normalizePayload(req.body);
    const validationMessage = validatePayload(data);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }
    
    const record = await Menstrual.findOne({
      where: { id, userId: req.userId }
    });
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    
    await record.update(data);
    
    await recalculateCycles(req.userId);
    
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
    const deleted = await Menstrual.destroy({
      where: { id, userId: req.userId }
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    
    await recalculateCycles(req.userId);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
