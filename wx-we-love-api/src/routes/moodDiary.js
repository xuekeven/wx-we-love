const express = require('express');
const router = express.Router();
const { MoodDiary, MoodDiaryComment, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

// 获取某月心情日记列表：本人 + 匹配对象
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.userId;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: '缺少 year 或 month 参数' });
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'year/month 无效' });
    }
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const user = await User.findByPk(userId, { attributes: ['matchedUserId'] });
    const matchedUserId = user?.matchedUserId || null;
    const userIds = [userId];
    if (matchedUserId) userIds.push(matchedUserId);

    const list = await MoodDiary.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [start, end] }
      },
      order: [['date', 'ASC']]
    });

    const toDateStr = (d) => {
      if (!d) return '';
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const date = new Date(s);
      if (Number.isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const self = list
      .filter((item) => item.userId === userId)
      .map((item) => ({ date: toDateStr(item.date), moodId: item.moodId }));
    const matched = matchedUserId
      ? list
          .filter((item) => item.userId === matchedUserId)
          .map((item) => ({ date: toDateStr(item.date), moodId: item.moodId }))
      : [];
    res.json({
      success: true,
      data: { self, matched }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 全部日记列表：本人 + 匹配对象，倒序，含作者信息与匹配对象是否已读
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId, { attributes: ['matchedUserId'] });
    const matchedUserId = user?.matchedUserId || null;
    const userIds = [userId];
    if (matchedUserId) userIds.push(matchedUserId);

    const list = await MoodDiary.findAll({
      where: { userId: { [Op.in]: userIds } },
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    const toDateStr = (d) => {
      if (!d) return '';
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const date = new Date(s);
      if (Number.isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const authorIds = [...new Set(list.map((item) => item.userId))];
    const users = await User.findAll({
      where: { id: { [Op.in]: authorIds } },
      attributes: ['id', 'currentName', 'currentAvatar']
    });
    const userMap = {};
    users.forEach((u) => { userMap[u.id] = u; });

    const now = new Date();
    for (const item of list) {
      if (item.userId !== userId && item.userId === matchedUserId && !item.readByMatchedAt) {
        await item.update({ readByMatchedAt: now });
        item.readByMatchedAt = now;
      }
    }

    const diaryIds = list.map((item) => item.id);
    const comments = diaryIds.length
      ? await MoodDiaryComment.findAll({
          where: { moodDiaryId: { [Op.in]: diaryIds } },
          order: [['createdAt', 'ASC']]
        })
      : [];
    const commentUserIds = [...new Set(comments.map((c) => c.userId))];
    const commentUsers = commentUserIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: commentUserIds } },
          attributes: ['id', 'currentName']
        })
      : [];
    const commentUserMap = {};
    commentUsers.forEach((u) => { commentUserMap[u.id] = u; });

    const formatCommentTime = (d) => {
      const date = new Date(d);
      const now = new Date();
      const today = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      if (today) return `今天 ${h}:${min}`;
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${m}-${day} ${h}:${min}`;
    };

    const commentsByDiary = {};
    diaryIds.forEach((id) => { commentsByDiary[id] = []; });
    comments.forEach((c) => {
      const u = commentUserMap[c.userId];
      commentsByDiary[c.moodDiaryId].push({
        id: c.id,
        userId: c.userId,
        authorName: u?.currentName || '未知',
        content: c.content,
        createdAt: formatCommentTime(c.createdAt)
      });
    });

    const data = list.map((item) => {
      const author = userMap[item.userId];
      const isBySelf = item.userId === userId;
      return {
        id: item.id,
        date: toDateStr(item.date),
        moodId: item.moodId,
        content: item.content || '',
        userId: item.userId,
        authorName: author?.currentName || '未知',
        authorAvatar: author?.currentAvatar || '',
        readByMatched: isBySelf ? !!item.readByMatchedAt : true,
        comments: commentsByDiary[item.id] || []
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取某条日记的评论列表（可选，用于提交评论后刷新）
router.get('/comments', authMiddleware, async (req, res) => {
  try {
    const { diaryId } = req.query;
    const userId = req.userId;
    if (!diaryId) {
      return res.status(400).json({ success: false, message: '缺少 diaryId 参数' });
    }
    const diary = await MoodDiary.findByPk(diaryId);
    if (!diary) {
      return res.status(404).json({ success: false, message: '日记不存在' });
    }
    const user = await User.findByPk(userId, { attributes: ['matchedUserId'] });
    const matchedUserId = user?.matchedUserId || null;
    const allowed = diary.userId === userId || diary.userId === matchedUserId;
    if (!allowed) {
      return res.status(403).json({ success: false, message: '无权查看' });
    }
    const list = await MoodDiaryComment.findAll({
      where: { moodDiaryId: diaryId },
      order: [['createdAt', 'ASC']]
    });
    const userIds = [...new Set(list.map((c) => c.userId))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'currentName'] })
      : [];
    const userMap = {};
    users.forEach((u) => { userMap[u.id] = u; });
    const formatTime = (d) => {
      const date = new Date(d);
      const now = new Date();
      const today = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      if (today) return `今天 ${h}:${min}`;
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${m}-${day} ${h}:${min}`;
    };
    const data = list.map((c) => ({
      id: c.id,
      userId: c.userId,
      authorName: userMap[c.userId]?.currentName || '未知',
      content: c.content,
      createdAt: formatTime(c.createdAt)
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 发表评论
router.post('/comment', authMiddleware, async (req, res) => {
  try {
    const { diaryId, content } = req.body;
    const userId = req.userId;
    if (!diaryId || content == null || String(content).trim() === '') {
      return res.status(400).json({ success: false, message: '缺少 diaryId 或 content' });
    }
    const diary = await MoodDiary.findByPk(diaryId);
    if (!diary) {
      return res.status(404).json({ success: false, message: '日记不存在' });
    }
    const user = await User.findByPk(userId, { attributes: ['matchedUserId'] });
    const matchedUserId = user?.matchedUserId || null;
    const allowed = diary.userId === userId || diary.userId === matchedUserId;
    if (!allowed) {
      return res.status(403).json({ success: false, message: '无权评论' });
    }
    const row = await MoodDiaryComment.create({
      moodDiaryId: diaryId,
      userId,
      content: String(content).trim().slice(0, 500)
    });
    res.json({ success: true, message: '评论成功', data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除日记（仅作者可删）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const diary = await MoodDiary.findByPk(id);
    if (!diary) {
      return res.status(404).json({ success: false, message: '日记不存在' });
    }
    if (diary.userId !== userId) {
      return res.status(403).json({ success: false, message: '只能删除自己的日记' });
    }
    await MoodDiaryComment.destroy({ where: { moodDiaryId: id } });
    await diary.destroy();
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取当前用户某一天的日记（用于编辑时拉取已有内容）
router.get('/entry', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.userId;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, message: '缺少 date 参数' });
    }
    const dateStr = String(date).slice(0, 10);
    const entry = await MoodDiary.findOne({
      where: { userId, date: dateStr }
    });
    if (!entry) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        date: String(entry.date).slice(0, 10),
        moodId: entry.moodId,
        content: entry.content || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 保存一条心情日记（同一天同用户会覆盖）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, moodId, content } = req.body;
    const userId = req.userId;
    if (!date || !moodId) {
      return res.status(400).json({ success: false, message: '缺少 date 或 moodId' });
    }
    const existing = await MoodDiary.findOne({
      where: { userId, date }
    });
    if (existing) {
      await existing.update({ moodId, content: content || null });
      return res.json({
        success: true,
        message: '更新成功',
        data: existing
      });
    }
    const row = await MoodDiary.create({
      userId,
      date,
      moodId,
      content: content || null
    });
    res.json({
      success: true,
      message: '保存成功',
      data: row
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
