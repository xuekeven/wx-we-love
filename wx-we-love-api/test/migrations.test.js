const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.SQLITE_STORAGE = ':memory:';
delete process.env.DB_HOST;

const { runMigrations } = require('../src/database/migrate');
const {
  sequelize,
  User,
  Couple,
  MoodDiary,
  MoodDiaryComment
} = require('../src/models');

before(async () => {
  await sequelize.sync({ force: true });
});

after(async () => {
  await sequelize.close();
});

test('migration backfills couples and merges duplicate diaries without losing comments', async () => {
  const [userA, userB] = await Promise.all([
    User.create({ openId: 'migration-a', isMatched: true }),
    User.create({ openId: 'migration-b', isMatched: true })
  ]);
  await Promise.all([
    userA.update({ matchedUserId: userB.id, sessionKey: 'must-clear' }),
    userB.update({ matchedUserId: userA.id, sessionKey: 'must-clear' })
  ]);
  const older = await MoodDiary.create({ userId: userA.id, date: '2026-08-06', moodId: 'sad' });
  const newer = await MoodDiary.create({ userId: userA.id, date: '2026-08-06', moodId: 'happy' });
  const comment = await MoodDiaryComment.create({ moodDiaryId: older.id, userId: userB.id, content: 'preserve me' });
  await newer.update({ content: 'canonical' });

  await runMigrations();
  await Promise.all([userA.reload(), userB.reload(), comment.reload()]);

  assert.equal(userA.coupleId, userB.coupleId);
  assert.ok(await Couple.findByPk(userA.coupleId));
  assert.equal(userA.sessionKey, null);
  assert.equal(await MoodDiary.count({ where: { userId: userA.id, coupleId: userA.coupleId, date: '2026-08-06' } }), 1);
  assert.ok(await MoodDiary.findByPk(comment.moodDiaryId));

  const indexes = await sequelize.getQueryInterface().showIndex('MoodDiaries');
  assert.ok(indexes.some((index) => index.name === 'mood_diaries_user_couple_date_unique' && index.unique));
});
