const express = require('express');
const router = express.Router();

// 模拟数据存储
let wishlist = [
  {
    id: '1',
    content: '一起去看极光',
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    content: '学会做对方喜欢的菜',
    status: 'completed',
    createdAt: '2024-01-10T10:00:00Z',
    completedAt: '2024-02-01T10:00:00Z'
  }
];

// 获取心愿清单
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: wishlist
  });
});

// 添加心愿
router.post('/', (req, res) => {
  const { content } = req.body;
  
  const newWish = {
    id: Date.now().toString(),
    content,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  wishlist.unshift(newWish);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newWish
  });
});

// 更新心愿状态
router.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const wish = wishlist.find(w => w.id === id);
  if (!wish) {
    return res.status(404).json({
      success: false,
      message: '心愿不存在'
    });
  }
  
  wish.status = status;
  if (status === 'completed') {
    wish.completedAt = new Date().toISOString();
  } else {
    delete wish.completedAt;
  }
  
  res.json({
    success: true,
    message: '更新成功',
    data: wish
  });
});

// 删除心愿
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = wishlist.findIndex(w => w.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '心愿不存在'
    });
  }
  
  wishlist.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

