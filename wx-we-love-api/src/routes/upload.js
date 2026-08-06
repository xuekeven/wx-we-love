const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const { createRateLimit } = require('../middleware/rateLimit');
const { saveImage } = require('../services/uploads');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 }
});
const uploadRateLimit = createRateLimit({
  name: 'upload',
  windowMs: 60 * 60 * 1000,
  max: 30,
  key: (req) => String(req.userId)
});

router.use(authMiddleware, uploadRateLimit);

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      const status = uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: status === 413 ? '图片不能超过 5MB' : '上传请求无效' });
    }
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    try {
      const saved = await saveImage(req.userId, req.file.buffer);
      res.status(201).json({ success: true, message: '上传成功', data: saved });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ success: false, message: error.message });
      next(error);
    }
  });
});

module.exports = router;
