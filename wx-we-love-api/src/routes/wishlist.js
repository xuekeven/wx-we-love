const express = require('express');
const router = express.Router();
const { Wishlist } = require('../models');

// 获取心愿清单
router.get('/', async (req, res) => {
  try {
    const wishlist = await Wishlist.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加心愿
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;
    const newWish = await Wishlist.create({ content });
    res.json({
      success: true,
      message: '添加成功',
      data: newWish
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新心愿状态
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const wish = await Wishlist.findByPk(id);
    if (!wish) {
      return res.status(404).json({ success: false, message: '心愿不存在' });
    }
    
    const updates = { status };
    if (status === 'completed') {
      updates.completedAt = new Date();
    } else {
      updates.completedAt = null;
    }
    
    await wish.update(updates);
    
    res.json({
      success: true,
      message: '更新成功',
      data: wish
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除心愿
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Wishlist.destroy({ where: { id } });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: '心愿不存在' });
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
