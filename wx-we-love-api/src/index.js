const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('./models');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// 静态文件：上传的图片可通过 /uploads/xxx 访问
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 数据库同步
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synchronized');
  })
  .catch(err => {
    console.error('❌ Database synchronization failed:', err);
  });

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api/user', require('./routes/user'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/anniversaries', require('./routes/anniversary'));
app.use('/api/menstrual', require('./routes/menstrual'));
app.use('/api/mood-diary', authMiddleware, require('./routes/moodDiary'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/', (req, res) => {
  res.json({ 
    message: '💕 Welcome to We Love API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      user: '/api/user',
      anniversaries: '/api/anniversaries',
      menstrual: '/api/menstrual',
      moodDiary: '/api/mood-diary'
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;

