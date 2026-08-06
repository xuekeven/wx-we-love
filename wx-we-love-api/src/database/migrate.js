const { DataTypes, Op, QueryTypes } = require('sequelize');
const { sequelize, User, Anniversary, MoodDiary, MoodDiaryComment, Couple } = require('../models');

const MIGRATIONS_TABLE = 'SchemaMigrations';

async function tableNames(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables.map((table) => typeof table === 'string' ? table : table.tableName || table.name);
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) await queryInterface.addColumn(tableName, columnName, definition);
}

async function ensureIndex(queryInterface, tableName, fields, options = {}) {
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === options.name)) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

async function createRelationshipTables(queryInterface) {
  const tables = await tableNames(queryInterface);
  if (!tables.includes('Couples')) {
    await queryInterface.createTable('Couples', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
      loveDate: { type: DataTypes.DATEONLY, allowNull: true },
      endedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  }

  if (!tables.includes('Moments')) {
    await queryInterface.createTable('Moments', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      coupleId: { type: DataTypes.UUID, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.STRING(1000), allowNull: false },
      imageUrl: { type: DataTypes.STRING(2048), allowNull: true },
      location: { type: DataTypes.STRING(120), allowNull: true },
      occurredAt: { type: DataTypes.DATE, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  }
}

async function backfillRelationships() {
  const users = await User.findAll({
    where: { isMatched: true, coupleId: null },
    order: [['id', 'ASC']]
  });
  const handled = new Set();

  for (const user of users) {
    if (!user.matchedUserId || handled.has(user.id)) continue;
    const partner = await User.findByPk(user.matchedUserId);
    if (!partner || partner.matchedUserId !== user.id || partner.coupleId) continue;

    await sequelize.transaction(async (transaction) => {
      const couple = await Couple.create({ loveDate: user.loveDate || partner.loveDate || null }, { transaction });
      await User.update(
        { coupleId: couple.id, isMatched: true },
        { where: { id: { [Op.in]: [user.id, partner.id] } }, transaction }
      );
      await Anniversary.update(
        { coupleId: couple.id },
        { where: { userId: { [Op.in]: [user.id, partner.id] }, coupleId: null }, transaction }
      );
      await MoodDiary.update(
        { coupleId: couple.id },
        { where: { userId: { [Op.in]: [user.id, partner.id] }, coupleId: null }, transaction }
      );
    });
    handled.add(user.id);
    handled.add(partner.id);
  }

  await User.update({ sessionKey: null }, { where: { sessionKey: { [Op.ne]: null } } });
}

async function deduplicateMoodDiaries() {
  const diaries = await MoodDiary.findAll({
    order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'ASC']]
  });
  const canonicalByKey = new Map();

  await sequelize.transaction(async (transaction) => {
    for (const diary of diaries) {
      const key = `${diary.userId}:${diary.coupleId || 'private'}:${String(diary.date).slice(0, 10)}`;
      const canonical = canonicalByKey.get(key);
      if (!canonical) {
        canonicalByKey.set(key, diary);
        continue;
      }

      await MoodDiaryComment.update(
        { moodDiaryId: canonical.id },
        { where: { moodDiaryId: diary.id }, transaction }
      );
      await diary.destroy({ transaction });
    }
  });
}

const migrations = [
  {
    name: '202608060001-couple-scope-and-indexes',
    async up(queryInterface) {
      await createRelationshipTables(queryInterface);
      await ensureColumn(queryInterface, 'Users', 'coupleId', { type: DataTypes.UUID, allowNull: true });
      await ensureColumn(queryInterface, 'Users', 'matchCodeExpiresAt', { type: DataTypes.DATE, allowNull: true });
      await ensureColumn(queryInterface, 'Users', 'tokenVersion', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
      await ensureColumn(queryInterface, 'Anniversaries', 'coupleId', { type: DataTypes.UUID, allowNull: true });
      await ensureColumn(queryInterface, 'MoodDiaries', 'coupleId', { type: DataTypes.UUID, allowNull: true });

      await ensureIndex(queryInterface, 'Users', ['coupleId'], { name: 'users_couple_id' });
      await ensureIndex(queryInterface, 'Anniversaries', ['coupleId', 'date'], { name: 'anniversaries_couple_date' });
      await ensureIndex(queryInterface, 'Anniversaries', ['userId', 'date'], { name: 'anniversaries_user_date' });
      await ensureIndex(queryInterface, 'Menstruals', ['userId', 'startDate'], { name: 'menstruals_user_start_date' });
      await ensureIndex(queryInterface, 'MoodDiaries', ['coupleId', 'date'], { name: 'mood_diaries_couple_date' });
      await ensureIndex(queryInterface, 'MoodDiaryComments', ['moodDiaryId', 'createdAt'], { name: 'mood_comments_diary_created' });
      await ensureIndex(queryInterface, 'Moments', ['coupleId', 'occurredAt'], { name: 'moments_couple_occurred' });

      await backfillRelationships();
      await deduplicateMoodDiaries();
      await ensureIndex(queryInterface, 'MoodDiaries', ['userId', 'coupleId', 'date'], { name: 'mood_diaries_user_couple_date_unique', unique: true });
    }
  }
];

async function runMigrations() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await tableNames(queryInterface);
  if (!tables.includes(MIGRATIONS_TABLE)) {
    await queryInterface.createTable(MIGRATIONS_TABLE, {
      name: { type: DataTypes.STRING(160), primaryKey: true, allowNull: false },
      executedAt: { type: DataTypes.DATE, allowNull: false }
    });
  }

  const appliedRows = await sequelize.query(`SELECT name FROM ${MIGRATIONS_TABLE}`, { type: QueryTypes.SELECT });
  const applied = new Set(appliedRows.map((row) => row.name));
  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    await migration.up(queryInterface);
    await queryInterface.bulkInsert(MIGRATIONS_TABLE, [{ name: migration.name, executedAt: new Date() }]);
  }
}

module.exports = { runMigrations };
