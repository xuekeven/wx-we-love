const express = require('express');
const router = express.Router();

// 模拟数据存储
let dateRecords = [
  {
    id: '1',
    title: '第一次约会',
    date: '2025-10-11',
    location: '星巴克咖啡',
    description: '我们的第一次见面，虽然有点紧张，但很开心',
    photos: [],
    rating: 5,
    createdAt: '2024-01-01T10:00:00Z'
  }
];

// 获取约会记录
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: dateRecords
  });
});

// 添加约会记录
router.post('/', (req, res) => {
  const { title, date, location, description, photos, rating } = req.body;
  
  const newRecord = {
    id: Date.now().toString(),
    title,
    date,
    location,
    description,
    photos: photos || [],
    rating: rating || 5,
    createdAt: new Date().toISOString()
  };
  
  dateRecords.unshift(newRecord);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newRecord
  });
});

// 删除约会记录
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = dateRecords.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    });
  }
  
  dateRecords.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

