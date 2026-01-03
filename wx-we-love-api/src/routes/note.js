const express = require('express');
const router = express.Router();

// 模拟数据存储
let notes = [
  {
    id: '1',
    title: '今天的心情',
    content: '今天天气很好，和TA一起散步，感觉特别幸福',
    mood: '😊',
    createdAt: '2024-04-20T10:00:00Z',
    updatedAt: '2024-04-20T10:00:00Z'
  }
];

// 获取笔记列表
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: notes
  });
});

// 添加笔记
router.post('/', (req, res) => {
  const { title, content, mood } = req.body;
  
  const newNote = {
    id: Date.now().toString(),
    title,
    content,
    mood: mood || '😊',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  notes.unshift(newNote);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newNote
  });
});

// 更新笔记
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, mood } = req.body;
  
  const note = notes.find(n => n.id === id);
  if (!note) {
    return res.status(404).json({
      success: false,
      message: '笔记不存在'
    });
  }
  
  if (title) note.title = title;
  if (content) note.content = content;
  if (mood) note.mood = mood;
  note.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: '更新成功',
    data: note
  });
});

// 删除笔记
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = notes.findIndex(n => n.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '笔记不存在'
    });
  }
  
  notes.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

module.exports = router;

