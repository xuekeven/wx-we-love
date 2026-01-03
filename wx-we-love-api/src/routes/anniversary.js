const express = require('express');
const router = express.Router();

// 模拟数据存储
let anniversaries = [
  {
    id: '1',
    title: '在一起纪念日',
    date: '2025-10-11',
    type: 'anniversary',
    isYearly: true,
    reminder: true,
    createdAt: '2024-01-01T10:00:00Z'
  }
];

// 获取纪念日列表
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: anniversaries
  });
});

// 添加纪念日
router.post('/', (req, res) => {
  const { title, date, type, isYearly, reminder } = req.body;
  
  const newAnniversary = {
    id: Date.now().toString(),
    title,
    date,
    type: type || 'custom',
    isYearly: isYearly !== false,
    reminder: reminder !== false,
    createdAt: new Date().toISOString()
  };
  
  anniversaries.unshift(newAnniversary);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newAnniversary
  });
});

// 删除纪念日
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = anniversaries.findIndex(a => a.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '纪念日不存在'
    });
  }
  
  anniversaries.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

