const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { getCorsOrigins } = require('./config/env');
const { isDatabaseReady } = require('./database');
const { UPLOAD_DIR } = require('./services/uploads');

function createApp() {
  const app = express();
  const corsOrigins = getCorsOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && corsOrigins.length === 0)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed'));
    }
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb', parameterLimit: 50 }));
  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    const startedAt = Date.now();
    res.on('finish', () => {
      console.log(JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      }));
    });
    next();
  });

  app.use('/uploads', express.static(path.resolve(UPLOAD_DIR), {
    dotfiles: 'deny',
    fallthrough: false,
    immutable: true,
    maxAge: '30d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));

  app.use('/api/user', require('./routes/user'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/anniversaries', require('./routes/anniversary'));
  app.use('/api/menstrual', require('./routes/menstrual'));
  app.use('/api/mood-diary', require('./routes/moodDiary'));
  app.use('/api/moments', require('./routes/moment'));

  app.get('/health/live', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get(['/health', '/health/ready'], (req, res) => {
    const ready = isDatabaseReady();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'not_ready', timestamp: new Date().toISOString() });
  });

  app.get('/', (req, res) => res.json({ message: 'We Love API', version: '2.0.0' }));
  app.use((req, res) => res.status(404).json({ success: false, message: 'API endpoint not found' }));
  app.use((error, req, res, next) => {
    console.error(JSON.stringify({ requestId: req.requestId, error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }));
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
