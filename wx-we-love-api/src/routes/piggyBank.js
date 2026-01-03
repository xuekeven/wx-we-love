const express = require('express');
const router = express.Router();

// 模拟数据存储
let piggyBankRecords = [
  {
    id: '1',
    amount: 100,
    type: 'income',
    category: '存入',
    description: '第一笔存款',
    createdAt: '2024-04-01T10:00:00Z'
  },
  {
    id: '2',
    amount: 50,
    type: 'expense',
    category: '约会花销',
    description: '看电影',
    createdAt: '2024-04-10T10:00:00Z'
  }
];

// 获取存钱罐记录
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: piggyBankRecords
  });
});

// 添加记录
router.post('/', (req, res) => {
  const { amount, type, category, description } = req.body;
  
  const newRecord = {
    id: Date.now().toString(),
    amount: parseFloat(amount),
    type: type || 'income',
    category,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  
  piggyBankRecords.unshift(newRecord);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newRecord
  });
});

// 删除记录
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = piggyBankRecords.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    });
  }
  
  piggyBankRecords.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

