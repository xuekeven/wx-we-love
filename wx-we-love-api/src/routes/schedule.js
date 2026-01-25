const express = require('express');
const router = express.Router();
const { Schedule } = require('../models');

// 获取日程列表
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.findAll({
      order: [['date', 'ASC'], ['time', 'ASC']]
    });
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加日程
router.post('/', async (req, res) => {
  try {
    const { title, date, time, location, description } = req.body;
    const newSchedule = await Schedule.create({
      title, date, time, location, description
    });
    res.json({
      success: true,
      message: '添加成功',
      data: newSchedule
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新日程状态
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: '日程不存在' });
    }
    
    await schedule.update({ status });
    
    res.json({
      success: true,
      message: '更新成功',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除日程
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Schedule.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: '日程不存在' });
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
