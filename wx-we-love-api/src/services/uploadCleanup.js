const fs = require('node:fs/promises');
const path = require('node:path');
const { Op } = require('sequelize');
const { User, Moment } = require('../models');
const {
  managedUploadKey,
  UPLOAD_DIR,
  UPLOAD_FILENAME,
  UPLOAD_OWNER,
  withUploadLock
} = require('./uploads');

const DAY_MS = 24 * 60 * 60 * 1000;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function ignoreMissing(error) {
  if (error.code !== 'ENOENT') throw error;
}

async function readDirectory(directory) {
  return await fs.readdir(directory, { withFileTypes: true }).catch(ignoreMissing) || [];
}

async function isOldFile(filePath, cutoff) {
  const stat = await fs.lstat(filePath).catch(ignoreMissing);
  return stat?.isFile() && stat.mtimeMs <= cutoff;
}

async function cleanUnusedUploads(now = Date.now()) {
  const cutoff = now - DAY_MS;
  const candidates = [];
  for (const owner of await readDirectory(UPLOAD_DIR)) {
    if (!owner.isDirectory() || !UPLOAD_OWNER.test(owner.name)) continue;

    const directory = path.join(UPLOAD_DIR, owner.name);
    for (const entry of await readDirectory(directory)) {
      if (!entry.isFile() || !UPLOAD_FILENAME.test(entry.name)) continue;
      if (await isOldFile(path.join(directory, entry.name), cutoff)) {
        candidates.push(`${owner.name}/${entry.name}`);
      }
    }
  }
  if (!candidates.length) return 0;

  // Serialize the reference snapshot and deletion with operations that attach uploads.
  return withUploadLock(async () => {
    const [users, moments] = await Promise.all([
      User.findAll({ attributes: ['currentAvatar'], where: { currentAvatar: { [Op.ne]: null } }, raw: true }),
      Moment.findAll({ attributes: ['imageUrl'], where: { imageUrl: { [Op.ne]: null } }, raw: true })
    ]);
    const referenced = new Set([
      ...users.map(({ currentAvatar }) => managedUploadKey(currentAvatar)),
      ...moments.map(({ imageUrl }) => managedUploadKey(imageUrl))
    ]);
    let removed = 0;
    for (const key of candidates) {
      if (referenced.has(key)) continue;
      const filePath = path.join(UPLOAD_DIR, key);
      if (!(await isOldFile(filePath, cutoff))) continue;
      try {
        await fs.unlink(filePath);
        removed++;
      } catch (error) {
        ignoreMissing(error);
      }
    }
    return removed;
  });
}

function nextBeijingMidnight(now) {
  return (Math.floor((now + BEIJING_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - BEIJING_OFFSET_MS;
}

function scheduleUploadCleanup() {
  let timer;
  let running;
  let stopped = false;

  function schedule() {
    const now = Date.now();
    timer = setTimeout(() => {
      running = cleanUnusedUploads()
        .then((removed) => console.log(`[upload-cleanup] removed ${removed} unused images`))
        .catch((error) => console.error('[upload-cleanup] failed:', error))
        .finally(() => {
          if (!stopped) schedule();
        });
    }, nextBeijingMidnight(now) - now);
    timer.unref();
  }

  schedule();
  return async () => {
    stopped = true;
    clearTimeout(timer);
    await running;
  };
}

module.exports = { cleanUnusedUploads, nextBeijingMidnight, scheduleUploadCleanup };
