const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CURRENT_BASE_URL } = require('../utils/url');

// 上传目录（项目根目录下的 uploads）
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = (file.mimetype && file.mimetype.split('/')[1]) || 'jpg';
    const name = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 jpg/png/gif/webp 图片'));
    }
  }
});

// POST /api/upload - 上传单张图片，返回可访问的 URL
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    }
    const url = `${CURRENT_BASE_URL.replace(/\/$/, '')}/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: '上传成功',
      data: { url }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

module.exports = router;
