const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const fs = require('node:fs/promises');
const jwt = require('jsonwebtoken');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.SQLITE_STORAGE = ':memory:';
const uploadDirectory = path.join(os.tmpdir(), `wx-we-love-upload-test-${process.pid}`);
process.env.UPLOAD_DIR = uploadDirectory;
delete process.env.DB_HOST;

const authMiddleware = require('../src/middleware/auth');
const userRoutes = require('../src/routes/user');
const uploadRoutes = require('../src/routes/upload');
const anniversaryRoutes = require('../src/routes/anniversary');
const menstrualRoutes = require('../src/routes/menstrual');
const moodDiaryRoutes = require('../src/routes/moodDiary');
const momentRoutes = require('../src/routes/moment');
const { clearRateLimits } = require('../src/middleware/rateLimit');
const { validateEnvironment } = require('../src/config/env');
const {
  sequelize,
  User,
  Couple,
  Anniversary,
  Menstrual,
  MoodDiary,
  MoodDiaryComment,
  Moment
} = require('../src/models');

let server;
let baseUrl;

function tokenFor(user, secret = process.env.JWT_SECRET) {
  return jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion }, secret, {
    expiresIn: '1h',
    issuer: 'wx-we-love-api',
    audience: 'wx-we-love-app'
  });
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/anniversaries', anniversaryRoutes);
  app.use('/api/menstrual', menstrualRoutes);
  app.use('/api/mood-diary', moodDiaryRoutes);
  app.use('/api/moments', momentRoutes);
  app.get('/protected', authMiddleware, (req, res) => res.json({ userId: req.userId }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
  clearRateLimits();
  await sequelize.sync({ force: true });
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await sequelize.close();
  await fs.rm(uploadDirectory, { recursive: true, force: true });
});

async function createCouple(openIdA, openIdB) {
  const couple = await Couple.create({ status: 'active' });
  const [userA, userB] = await Promise.all([
    User.create({ openId: openIdA, coupleId: couple.id, isMatched: true }),
    User.create({ openId: openIdB, coupleId: couple.id, isMatched: true })
  ]);
  await Promise.all([
    userA.update({ matchedUserId: userB.id }),
    userB.update({ matchedUserId: userA.id })
  ]);
  return { couple, userA, userB };
}

function authHeaders(user) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

test('unmatching one couple preserves unrelated users data', async () => {
  const [userA, userB, thirdParty] = await Promise.all([
    User.create({ openId: 'a', matchCode: '111111', isMatched: true }),
    User.create({ openId: 'b', matchCode: '222222', isMatched: true }),
    User.create({ openId: 'c', matchCode: '333333', isMatched: false })
  ]);
  await userA.update({ matchedUserId: userB.id });
  await userB.update({ matchedUserId: userA.id });

  const anniversary = await Anniversary.create({ userId: thirdParty.id, title: 'keep', date: '2026-08-06' });
  const menstrual = await Menstrual.create({ userId: thirdParty.id, startDate: '2026-08-01' });
  const diary = await MoodDiary.create({ userId: thirdParty.id, date: '2026-08-06', moodId: 'happy' });
  const comment = await MoodDiaryComment.create({ moodDiaryId: diary.id, userId: thirdParty.id, content: 'keep' });

  const response = await request('/api/user/unmatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenFor(userA)}` }
  });

  assert.equal(response.status, 200);
  assert.ok(await Anniversary.findByPk(anniversary.id));
  assert.ok(await Menstrual.findByPk(menstrual.id));
  assert.ok(await MoodDiary.findByPk(diary.id));
  assert.ok(await MoodDiaryComment.findByPk(comment.id));
});

test('authentication never accepts the published fallback secret', async () => {
  const user = await User.create({ openId: 'fallback', matchCode: '444444' });
  const forgedToken = tokenFor(user, 'your_secret_key');
  delete process.env.JWT_SECRET;

  try {
    const response = await request('/protected', {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });

    assert.equal(response.status, 503);
  } finally {
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
  }
});

test('production configuration rejects a non-HTTPS public API URL', () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    WX_APPID: process.env.WX_APPID,
    WX_SECRET: process.env.WX_SECRET,
    API_BASE_URL: process.env.API_BASE_URL
  };
  Object.assign(process.env, {
    NODE_ENV: 'production',
    WX_APPID: 'test-app-id',
    WX_SECRET: 'test-app-secret',
    API_BASE_URL: 'http://api.example.com'
  });

  try {
    assert.throws(validateEnvironment, /must use HTTPS/);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('authentication rejects malformed bearer headers and accepts the valid form', async () => {
  const user = await User.create({ openId: 'bearer-format' });
  const token = tokenFor(user);

  const malformedResponse = await request('/protected', {
    headers: { Authorization: `Bearer ${token} trailing-data` }
  });
  const validResponse = await request('/protected', {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(malformedResponse.status, 401);
  assert.equal(validResponse.status, 200);
});

test('logout revokes the token that authorized it', async () => {
  const user = await User.create({ openId: 'logout-user' });
  const headers = authHeaders(user);

  const logoutResponse = await request('/api/user/logout', { method: 'POST', headers });
  const reusedTokenResponse = await request('/protected', { headers });

  assert.equal(logoutResponse.status, 200);
  assert.equal(reusedTokenResponse.status, 401);
});

test('legacy one-way match references cannot alter an unrelated user', async () => {
  const [staleUser, unrelatedUser, unrelatedPartner] = await Promise.all([
    User.create({ openId: 'stale-user', isMatched: true }),
    User.create({ openId: 'unrelated-user', isMatched: true }),
    User.create({ openId: 'unrelated-partner', isMatched: true })
  ]);
  await Promise.all([
    staleUser.update({ matchedUserId: unrelatedUser.id }),
    unrelatedUser.update({ matchedUserId: unrelatedPartner.id }),
    unrelatedPartner.update({ matchedUserId: unrelatedUser.id })
  ]);

  const response = await request('/api/user/unmatch', {
    method: 'POST',
    headers: authHeaders(staleUser)
  });

  assert.equal(response.status, 200);
  await Promise.all([unrelatedUser.reload(), unrelatedPartner.reload()]);
  assert.equal(unrelatedUser.isMatched, true);
  assert.equal(unrelatedUser.matchedUserId, unrelatedPartner.id);
  assert.equal(unrelatedPartner.isMatched, true);
  assert.equal(unrelatedPartner.matchedUserId, unrelatedUser.id);
});

test('upload endpoint rejects anonymous requests before parsing files', async () => {
  const response = await request('/api/upload', { method: 'POST' });
  assert.equal(response.status, 401);
});

test('matching creates one active couple and updates both users atomically', async () => {
  const expiresAt = new Date(Date.now() + 60_000);
  const [userA, userB] = await Promise.all([
    User.create({ openId: 'match-a', matchCode: '123456', matchCodeExpiresAt: expiresAt }),
    User.create({ openId: 'match-b', matchCode: '654321', matchCodeExpiresAt: expiresAt })
  ]);

  const response = await request('/api/user/match', {
    method: 'POST',
    headers: { ...authHeaders(userA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchCode: userB.matchCode })
  });

  assert.equal(response.status, 200);
  await Promise.all([userA.reload(), userB.reload()]);
  assert.equal(userA.coupleId, userB.coupleId);
  assert.equal(userA.matchedUserId, userB.id);
  assert.equal(userB.matchedUserId, userA.id);
  assert.equal(await Couple.count({ where: { status: 'active' } }), 1);
});

test('expired match codes cannot create a relationship', async () => {
  const [userA, userB] = await Promise.all([
    User.create({ openId: 'expired-a', matchCode: '123456', matchCodeExpiresAt: new Date(Date.now() + 60_000) }),
    User.create({ openId: 'expired-b', matchCode: '654321', matchCodeExpiresAt: new Date(Date.now() - 1) })
  ]);

  const response = await request('/api/user/match', {
    method: 'POST',
    headers: { ...authHeaders(userA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchCode: userB.matchCode })
  });

  assert.equal(response.status, 404);
  assert.equal(await Couple.count(), 0);
});

test('anniversaries are shared only within the active couple', async () => {
  const first = await createCouple('anniversary-a', 'anniversary-b');
  const second = await createCouple('anniversary-c', 'anniversary-d');
  const anniversary = await Anniversary.create({
    userId: first.userA.id,
    coupleId: first.couple.id,
    title: 'Together',
    date: '2026-08-06'
  });

  const partnerResponse = await request('/api/anniversaries', { headers: authHeaders(first.userB) });
  const unrelatedResponse = await request('/api/anniversaries', { headers: authHeaders(second.userA) });
  const partnerBody = await partnerResponse.json();
  const unrelatedBody = await unrelatedResponse.json();

  assert.equal(partnerBody.data[0].id, anniversary.id);
  assert.deepEqual(unrelatedBody.data, []);
});

test('menstrual records remain private to their owner', async () => {
  const { userA, userB } = await createCouple('menstrual-a', 'menstrual-b');
  const record = await Menstrual.create({ userId: userA.id, startDate: '2026-08-01' });

  const ownerResponse = await request(`/api/menstrual/${record.id}`, { headers: authHeaders(userA) });
  const partnerResponse = await request(`/api/menstrual/${record.id}`, { headers: authHeaders(userB) });
  const partnerListResponse = await request('/api/menstrual', { headers: authHeaders(userB) });
  const partnerListBody = await partnerListResponse.json();

  assert.equal(ownerResponse.status, 200);
  assert.equal(partnerResponse.status, 404);
  assert.deepEqual(partnerListBody.data, []);
});

test('moments are relationship-scoped and only their author can delete them', async () => {
  const first = await createCouple('moment-a', 'moment-b');
  const second = await createCouple('moment-c', 'moment-d');
  const moment = await Moment.create({
    coupleId: first.couple.id,
    userId: first.userA.id,
    content: 'shared in one relationship',
    occurredAt: new Date('2026-08-01T00:00:00.000Z')
  });

  const partnerResponse = await request('/api/moments', { headers: authHeaders(first.userB) });
  const unrelatedResponse = await request('/api/moments', { headers: authHeaders(second.userA) });
  const unauthorizedDeleteResponse = await request(`/api/moments/${moment.id}`, {
    method: 'DELETE',
    headers: authHeaders(first.userB)
  });
  const authorDeleteResponse = await request(`/api/moments/${moment.id}`, {
    method: 'DELETE',
    headers: authHeaders(first.userA)
  });
  const partnerBody = await partnerResponse.json();
  const unrelatedBody = await unrelatedResponse.json();

  assert.equal(partnerBody.data[0].id, moment.id);
  assert.deepEqual(unrelatedBody.data, []);
  assert.equal(unauthorizedDeleteResponse.status, 404);
  assert.equal(authorDeleteResponse.status, 200);
});

test('mood diaries remain tied to the relationship in which they were written', async () => {
  const oldRelationship = await createCouple('history-a', 'history-b');
  const futurePartner = await User.create({
    openId: 'history-c',
    matchCode: '887766',
    matchCodeExpiresAt: new Date(Date.now() + 60_000)
  });
  const diary = await MoodDiary.create({
    userId: oldRelationship.userA.id,
    coupleId: oldRelationship.couple.id,
    date: '2026-08-06',
    moodId: 'happy',
    content: 'old relationship'
  });

  const unmatchResponse = await request('/api/user/unmatch', {
    method: 'POST',
    headers: authHeaders(oldRelationship.userA)
  });
  assert.equal(unmatchResponse.status, 200);
  await oldRelationship.userA.reload();

  const matchResponse = await request('/api/user/match', {
    method: 'POST',
    headers: { ...authHeaders(oldRelationship.userA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchCode: futurePartner.matchCode })
  });
  assert.equal(matchResponse.status, 200);

  const listResponse = await request('/api/mood-diary/all', { headers: authHeaders(futurePartner) });
  const listBody = await listResponse.json();
  assert.deepEqual(listBody.data, []);
  assert.ok(await MoodDiary.findByPk(diary.id));
});

test('authenticated upload rejects a fake image regardless of declared MIME type', async () => {
  const user = await User.create({ openId: 'upload-user' });
  const form = new FormData();
  form.append('file', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');

  const response = await request('/api/upload', {
    method: 'POST',
    headers: authHeaders(user),
    body: form
  });

  assert.equal(response.status, 415);
});

test('account deletion removes database records and uploaded files', async () => {
  const user = await User.create({ openId: 'delete-user' });
  const form = new FormData();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  form.append('file', new Blob([png], { type: 'image/png' }), 'pixel.png');
  const uploadResponse = await request('/api/upload', {
    method: 'POST',
    headers: authHeaders(user),
    body: form
  });
  assert.equal(uploadResponse.status, 201);
  assert.ok(await fs.stat(path.join(uploadDirectory, String(user.id))));

  const deleteResponse = await request('/api/user/delete-account', {
    method: 'POST',
    headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE' })
  });

  assert.equal(deleteResponse.status, 200);
  assert.equal(await User.findByPk(user.id), null);
  await assert.rejects(fs.stat(path.join(uploadDirectory, String(user.id))), { code: 'ENOENT' });
});
