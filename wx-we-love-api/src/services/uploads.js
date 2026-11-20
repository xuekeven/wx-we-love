const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { CURRENT_BASE_URL, normalizeUrl } = require('../utils/url');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const UPLOAD_OWNER = /^[1-9]\d*$/;
const UPLOAD_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|gif|webp)$/;
let uploadOperation = Promise.resolve();

function managedUploadKey(value) {
  if (!value) return null;
  try {
    // Keep references from old domains and reverse-proxy paths, including URLs with cache parameters.
    const pathname = decodeURIComponent(new URL(value, CURRENT_BASE_URL).pathname);
    const [name, owner, directory] = pathname.split('/').reverse();
    if (directory === 'uploads' && UPLOAD_OWNER.test(owner) && UPLOAD_FILENAME.test(name)) {
      return `${owner}/${name}`;
    }
  } catch {
    return null;
  }
  return null;
}

function withUploadLock(operation) {
  const result = uploadOperation.then(operation);
  uploadOperation = result.catch(() => {});
  return result;
}

function withUploadReference(url, saveReference) {
  const key = managedUploadKey(url);
  if (!key) return saveReference();

  return withUploadLock(async () => {
    const base = new URL(CURRENT_BASE_URL);
    const target = new URL(normalizeUrl(url), base);
    const uploadPath = `${base.pathname.replace(/\/$/, '')}/uploads/`;
    if (target.origin === base.origin && decodeURIComponent(target.pathname).startsWith(uploadPath)) {
      const file = await fs.lstat(path.join(UPLOAD_DIR, key)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      if (!file?.isFile()) {
        throw Object.assign(new Error('照片已失效，请重新选择'), { code: 'UPLOAD_EXPIRED' });
      }
    }
    return saveReference();
  });
}

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

module.exports = {
  deleteUserUploads,
  managedUploadKey,
  saveImage,
  UPLOAD_DIR,
  UPLOAD_FILENAME,
  UPLOAD_OWNER,
  withUploadLock,
  withUploadReference
};
