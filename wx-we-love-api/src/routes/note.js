const express = require('express');
const router = express.Router();
const { Note } = require('../models');

// 获取笔记列表
router.get('/', async (req, res) => {
  try {
    const notes = await Note.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加笔记
router.post('/', async (req, res) => {
  try {
    const { title, content, mood } = req.body;
    const newNote = await Note.create({ title, content, mood });
    res.json({
      success: true,
      message: '添加成功',
      data: newNote
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新笔记
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, mood } = req.body;
    
    const note = await Note.findByPk(id);
    if (!note) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
    }
    
    await note.update({ title, content, mood });
    
    res.json({
      success: true,
      message: '更新成功',
      data: note
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除笔记
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Note.destroy({ where: { id } });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
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
