require('dotenv').config();
const { createApp } = require('./app');
const { validateEnvironment } = require('./config/env');
const { initializeDatabase, markDatabaseNotReady } = require('./database');
const { sequelize } = require('./models');
const { scheduleUploadCleanup } = require('./services/uploadCleanup');

async function startServer() {
  validateEnvironment();
  await initializeDatabase();
  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[startup] wx-we-love-api listening on ${port}`);
  });

  const stopUploadCleanup = process.env.NODE_ENV === 'production' && process.env.UPLOAD_CLEANUP_ENABLED !== 'false'
    ? scheduleUploadCleanup()
    : null;

  async function shutdown(signal) {
    console.log(`[shutdown] received ${signal}`);
    markDatabaseNotReady();
    const cleanupFinished = stopUploadCleanup?.();
    server.close(async () => {
      await cleanupFinished;
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[startup] failed:', error);
    process.exit(1);
  });
}

module.exports = { startServer };
