const express = require('express');
const router = express.Router();
const { User } = require('../models');

// 获取用户信息
router.get('/info', async (req, res) => {
  try {
    let user = await User.findOne();
    
    // 如果没有用户，创建一个默认用户
    if (!user) {
      user = await User.create({
        loveDate: '2025-10-11',
        name1: '薛凯',
        name2: '沈诗怡',
        avatar1: 'https://via.placeholder.com/150',
        avatar2: 'https://via.placeholder.com/150',
        functionOrder: {
          '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
        }
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户信息
router.post('/info', async (req, res) => {
  try {
    const updates = req.body;
    let user = await User.findOne();
    
    if (user) {
      await user.update(updates);
    } else {
      user = await User.create(updates);
    }
    
    res.json({
      success: true,
      message: '更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新功能排序
router.post('/function-order', async (req, res) => {
  try {
    const { functionOrder } = req.body;
    let user = await User.findOne();
    
    if (user) {
      await user.update({ functionOrder });
    } else {
      user = await User.create({ functionOrder });
    }
    
    res.json({
      success: true,
      message: '排序已更新',
      data: user
    });
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
