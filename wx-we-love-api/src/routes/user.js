const express = require('express');
const router = express.Router();

// 模拟用户数据
const mockUserData = {
  id: 1,
  loveDate: '2025-10-11',
  coupleNames: {
    name1: '薛凯',
    name2: '沈诗怡'
  },
  avatar1: 'https://via.placeholder.com/150',
  avatar2: 'https://via.placeholder.com/150',
  functionOrder: {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6
  }
};

// 获取用户信息
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: mockUserData
  });
});

// 更新用户信息
router.post('/info', (req, res) => {
  const updates = req.body;
  Object.assign(mockUserData, updates);
  
  res.json({
    success: true,
    message: '更新成功',
    data: mockUserData
  });
});

// 更新功能排序
router.post('/function-order', (req, res) => {
  const { functionOrder } = req.body;
  mockUserData.functionOrder = functionOrder;
  
  res.json({
    success: true,
    message: '排序已更新',
    data: mockUserData
  });
});

module.exports = router;

