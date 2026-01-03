const express = require('express');
const router = express.Router();

// 模拟数据存储
let menstrualRecords = [
  {
    id: '1',
    startDate: '2025-03-15',
    endDate: '2025-03-20',
    cycleLength: 28,
    symptoms: ['轻微腹痛', '情绪波动'],
    note: '一切正常',
    createdAt: '2025-03-15T10:00:00Z'
  },
  {
    id: '2',
    startDate: '2025-02-16',
    endDate: '2025-02-21',
    cycleLength: 27,
    symptoms: ['腹痛', '腰酸'],
    note: '',
    createdAt: '2025-02-16T10:00:00Z'
  }
];

// 获取经期记录列表
router.get('/', (req, res) => {
  // 按日期倒序排列
  const sortedRecords = [...menstrualRecords].sort((a, b) => {
    return new Date(b.startDate) - new Date(a.startDate);
  });
  
  res.json({
    success: true,
    data: sortedRecords
  });
});

// 获取单条记录
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const record = menstrualRecords.find(r => r.id === id);
  
  if (!record) {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    });
  }
  
  res.json({
    success: true,
    data: record
  });
});

// 添加经期记录
router.post('/', (req, res) => {
  const { startDate, endDate, symptoms, note } = req.body;
  
  if (!startDate) {
    return res.status(400).json({
      success: false,
      message: '请提供开始日期'
    });
  }
  
  // 计算周期长度（如果有上一条记录）
  let cycleLength = null;
  if (menstrualRecords.length > 0) {
    const lastRecord = menstrualRecords.sort((a, b) => 
      new Date(b.startDate) - new Date(a.startDate)
    )[0];
    
    const lastDate = new Date(lastRecord.startDate);
    const currentDate = new Date(startDate);
    cycleLength = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
  }
  
  const newRecord = {
    id: Date.now().toString(),
    startDate,
    endDate: endDate || null,
    cycleLength,
    symptoms: symptoms || [],
    note: note || '',
    createdAt: new Date().toISOString()
  };
  
  menstrualRecords.unshift(newRecord);
  
  res.json({
    success: true,
    message: '添加成功',
    data: newRecord
  });
});

// 更新经期记录
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, symptoms, note } = req.body;
  
  const recordIndex = menstrualRecords.findIndex(r => r.id === id);
  
  if (recordIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    });
  }
  
  const updatedRecord = {
    ...menstrualRecords[recordIndex],
    startDate: startDate || menstrualRecords[recordIndex].startDate,
    endDate: endDate !== undefined ? endDate : menstrualRecords[recordIndex].endDate,
    symptoms: symptoms || menstrualRecords[recordIndex].symptoms,
    note: note !== undefined ? note : menstrualRecords[recordIndex].note,
    updatedAt: new Date().toISOString()
  };
  
  menstrualRecords[recordIndex] = updatedRecord;
  
  res.json({
    success: true,
    message: '更新成功',
    data: updatedRecord
  });
});

// 删除经期记录
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = menstrualRecords.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '记录不存在'
    });
  }
  
  menstrualRecords.splice(index, 1);
  
  res.json({
    success: true,
    message: '删除成功'
  });
});

// 获取周期统计
router.get('/stats/cycle', (req, res) => {
  if (menstrualRecords.length < 2) {
    return res.json({
      success: true,
      data: {
        averageCycle: 28,
        recordCount: menstrualRecords.length
      }
    });
  }
  
  const sorted = [...menstrualRecords].sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  );
  
  const cycles = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].startDate);
    const next = new Date(sorted[i + 1].startDate);
    const days = Math.round((next - current) / (1000 * 60 * 60 * 24));
    if (days > 0 && days < 60) { // 排除异常值
      cycles.push(days);
    }
  }
  
  const averageCycle = cycles.length > 0 
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : 28;
  
  res.json({
    success: true,
    data: {
      averageCycle,
      recordCount: menstrualRecords.length,
      cycles
    }
  });
});

module.exports = router;

