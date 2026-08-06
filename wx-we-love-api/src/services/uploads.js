const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { CURRENT_BASE_URL } = require('../utils/url');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
    return { extension: 'gif', mimeType: 'image/gif' };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: 'webp', mimeType: 'image/webp' };
  }
  return null;
}

async function saveImage(userId, buffer) {
  const image = detectImage(buffer);
  if (!image) {
    const error = new Error('文件内容不是受支持的图片');
    error.status = 415;
    throw error;
  }
  const userDirectory = path.join(UPLOAD_DIR, String(userId));
  await fs.mkdir(userDirectory, { recursive: true, mode: 0o750 });
  const filename = `${crypto.randomUUID()}.${image.extension}`;
  await fs.writeFile(path.join(userDirectory, filename), buffer, { flag: 'wx', mode: 0o640 });
  return {
    mimeType: image.mimeType,
    url: `${CURRENT_BASE_URL.replace(/\/$/, '')}/uploads/${userId}/${filename}`
  };
}

async function deleteUserUploads(userId) {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid upload owner');
  const userDirectory = path.resolve(UPLOAD_DIR, String(userId));
  const relative = path.relative(UPLOAD_DIR, userDirectory);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Unsafe upload cleanup path');
  }
  await fs.rm(userDirectory, { recursive: true, force: true });
}

module.exports = { deleteUserUploads, saveImage, UPLOAD_DIR };
