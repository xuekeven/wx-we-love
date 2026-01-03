const express = require('express');
const router = express.Router();

// 模拟数据存储
let schedules = [
  {
    id: '1',
    title: '周末约会',
    date: '2024-04-27',
    time: '14:00',
    location: '市中心电影院',
    description: '看最新上映的电影',
    status: 'pending',
    createdAt: '2024-04-20T10:00:00Z'
  }
];

// 获取日程列表
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: schedules
  });
});

// 添加日程
router.post('/', (req, res) => {
  const { title, date, time, location, description } = req.body;
  
  const newSchedule = {
    id: Date.now().toString(),
    title,
    date,
    time,
    location: location || '',
    description: description || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  schedules.unshift(newSchedule);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newSchedule
  });
});

// 更新日程状态
router.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: '日程不存在'
    });
  }
  
  schedule.status = status;
  
  res.json({
    success: true,
    message: '更新成功',
    data: schedule
  });
});

// 删除日程
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = schedules.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '日程不存在'
    });
  }
  
  schedules.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

