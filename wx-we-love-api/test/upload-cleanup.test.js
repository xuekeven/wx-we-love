const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

process.env.SQLITE_STORAGE = ':memory:';
process.env.API_BASE_URL = 'https://example.invalid/welove';
const directory = path.join(os.tmpdir(), `wx-we-love-cleanup-${randomUUID()}`);
process.env.UPLOAD_DIR = directory;
delete process.env.DB_HOST;

const { sequelize, User, Couple, Moment } = require('../src/models');
const { cleanUnusedUploads, nextBeijingMidnight } = require('../src/services/uploadCleanup');
const { saveImage, withUploadReference } = require('../src/services/uploads');
const oldTime = new Date('2026-11-18T15:59:59.000Z');
const cleanupTime = Date.parse('2026-11-19T16:00:00.000Z');

before(async () => { await sequelize.sync(); });
after(async () => {
  await sequelize.close();
  await fs.rm(directory, { recursive: true, force: true });
});

async function createImage(owner, modifiedAt = oldTime) {
  const { url } = await saveImage(owner, Buffer.from('GIF89a'));
  const filePath = path.join(directory, String(owner), url.split('/').pop());
  await fs.utimes(filePath, modifiedAt, modifiedAt);
  return { url, filePath };
}

test('midnight is calculated in UTC+8 regardless of the host timezone', () => {
  assert.equal(nextBeijingMidnight(cleanupTime - 1), cleanupTime);
  assert.equal(nextBeijingMidnight(cleanupTime), cleanupTime + 86400000);
});

test('cleanup preserves avatars, published pictures, fresh uploads and unrelated files', async () => {
  const user = await User.create({ openId: 'cleanup-owner' });
  const couple = await Couple.create({ status: 'active' });
  const avatar = await createImage(user.id);
  const moment = await createImage(user.id);
  const orphan = await createImage(user.id);
  const fresh = await createImage(user.id, new Date(cleanupTime - 60000));
  const unmanaged = path.join(directory, String(user.id), 'other.png');
  const symlink = path.join(directory, String(user.id), `${randomUUID()}.png`);
  await fs.writeFile(unmanaged, 'keep');
  await fs.utimes(unmanaged, oldTime, oldTime);
  await fs.symlink(unmanaged, symlink);
  await user.update({ currentAvatar: avatar.url.replace('example.invalid/welove', 'old.example.invalid') + '?v=1' });
  await Moment.create({ userId: user.id, coupleId: couple.id, content: '已发布', imageUrl: moment.url });

  assert.equal(await cleanUnusedUploads(cleanupTime), 1);
  await assert.rejects(fs.access(orphan.filePath), { code: 'ENOENT' });
  await assert.rejects(withUploadReference(orphan.url, () => assert.fail('expired upload was attached')), { code: 'UPLOAD_EXPIRED' });
  for (const existing of [avatar.filePath, moment.filePath, fresh.filePath, unmanaged, symlink]) {
    await fs.access(existing);
  }
  assert.equal(await cleanUnusedUploads(cleanupTime), 0);
});

test('cleanup waits for a concurrent image reference to commit', async (t) => {
  const user = await User.create({ openId: 'cleanup-race' });
  const image = await createImage(user.id);
  let beginSave;
  let finishSave;
  const started = new Promise((resolve) => { beginSave = resolve; });
  const maySave = new Promise((resolve) => { finishSave = resolve; });
  const save = withUploadReference(image.url, async () => {
    beginSave();
    await maySave;
    await user.update({ currentAvatar: image.url });
  });
  await started;
  let scanned;
  const candidateScanned = new Promise((resolve) => { scanned = resolve; });
  const lstat = fs.lstat.bind(fs);
  t.mock.method(fs, 'lstat', async (filePath, ...args) => {
    const stat = await lstat(filePath, ...args);
    if (filePath === image.filePath) scanned();
    return stat;
  });
  const referenceQuery = t.mock.method(User, 'findAll');
  const cleanup = cleanUnusedUploads(cleanupTime);
  await candidateScanned;
  await new Promise(setImmediate);
  try {
    assert.equal(referenceQuery.mock.callCount(), 0);
  } finally {
    finishSave();
  }
  await save;
  assert.equal(await cleanup, 0);
  await fs.access(image.filePath);
});

test('a failed reference scan leaves uploaded files untouched', async (t) => {
  const user = await User.create({ openId: 'cleanup-failed-scan' });
  const image = await createImage(user.id);
  t.mock.method(Moment, 'findAll', async () => { throw new Error('database unavailable'); });
  await assert.rejects(cleanUnusedUploads(cleanupTime), /database unavailable/);
  await fs.access(image.filePath);
});
