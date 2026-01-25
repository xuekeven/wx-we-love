const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 4000;

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
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/date-records', require('./routes/dateRecord'));
app.use('/api/anniversaries', require('./routes/anniversary'));
app.use('/api/notes', require('./routes/note'));
app.use('/api/piggy-bank', require('./routes/piggyBank'));
app.use('/api/menstrual', require('./routes/menstrual'));

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
      wishlist: '/api/wishlist',
      dateRecords: '/api/date-records',
      anniversaries: '/api/anniversaries',
      notes: '/api/notes',
      piggyBank: '/api/piggy-bank',
      menstrual: '/api/menstrual'
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

