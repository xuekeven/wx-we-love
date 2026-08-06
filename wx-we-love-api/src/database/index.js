const { sequelize } = require('../models');
const { runMigrations } = require('./migrate');

let ready = false;

async function initializeDatabase() {
  ready = false;
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const names = tables.map((table) => typeof table === 'string' ? table : table.tableName || table.name);

  if (!names.includes('Users')) {
    await sequelize.sync();
  }
  await runMigrations();
  ready = true;
}

function isDatabaseReady() {
  return ready;
}

function markDatabaseNotReady() {
  ready = false;
}

module.exports = { initializeDatabase, isDatabaseReady, markDatabaseNotReady };
