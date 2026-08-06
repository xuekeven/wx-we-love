const express = require('express');
const { Op, UniqueConstraintError } = require('sequelize');
const { MoodDiary, MoodDiaryComment, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const { getActiveMembership } = require('../services/couple');
const { normalizeUrl } = require('../utils/url');
const { isValidDateOnly, parseDateOnly, validateOptionalText } = require('../utils/validation');

const router = express.Router();
const MOOD_IDS = new Set(['tired', 'angry', 'excited', 'heartbeat', 'happy', 'sad', 'calm', 'annoyed']);
router.use(authMiddleware);

function diaryScope(membership, userId) {
  return membership.couple ? { coupleId: membership.couple.id } : { userId, coupleId: null };
}

function toDateString(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formatCommentTime(value) {
  const date = new Date(value);
  const now = new Date();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (now.toDateString() === date.toDateString()) return `今天 ${time}`;
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${time}`;
}

async function canAccessDiary(userId, diary) {
  const membership = await getActiveMembership(userId);
  if (diary.userId === userId && !diary.coupleId) return true;
  return !!membership.couple && diary.coupleId === membership.couple.id;
}

router.get('/', async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || year < 1970 || year > 2200 || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year/month 无效' });
    }
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    const membership = await getActiveMembership(req.userId);
    const list = await MoodDiary.findAll({
      where: { ...diaryScope(membership, req.userId), date: { [Op.between]: [start, end] } },
      order: [['date', 'ASC']]
    });
    res.json({
      success: true,
      data: {
        self: list.filter((item) => item.userId === req.userId).map((item) => ({ date: toDateString(item.date), moodId: item.moodId })),
        matched: list.filter((item) => item.userId !== req.userId).map((item) => ({ date: toDateString(item.date), moodId: item.moodId }))
      }
    });
  } catch (error) {
    console.error('获取心情日历失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const membership = await getActiveMembership(req.userId);
    const list = await MoodDiary.findAll({
      where: diaryScope(membership, req.userId),
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    const authorIds = [...new Set(list.map((item) => item.userId))];
    const users = authorIds.length
      ? await User.findAll({ where: { id: { [Op.in]: authorIds } }, attributes: ['id', 'currentName', 'currentAvatar'] })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));

    const unread = list.filter((item) => item.userId !== req.userId && !item.readByMatchedAt);
    if (unread.length) {
      await MoodDiary.update({ readByMatchedAt: new Date() }, { where: { id: { [Op.in]: unread.map((item) => item.id) } } });
      unread.forEach((item) => { item.readByMatchedAt = new Date(); });
    }

    const diaryIds = list.map((item) => item.id);
    const comments = diaryIds.length
      ? await MoodDiaryComment.findAll({ where: { moodDiaryId: { [Op.in]: diaryIds } }, order: [['createdAt', 'ASC']] })
      : [];
    const commentUserIds = [...new Set(comments.map((comment) => comment.userId))];
    const commentUsers = commentUserIds.length
      ? await User.findAll({ where: { id: { [Op.in]: commentUserIds } }, attributes: ['id', 'currentName'] })
      : [];
    const commentUserMap = new Map(commentUsers.map((user) => [user.id, user]));
    const commentsByDiary = new Map();
    comments.forEach((comment) => {
      const value = {
        id: comment.id,
        userId: comment.userId,
        authorName: commentUserMap.get(comment.userId)?.currentName || '未知',
        content: comment.content,
        createdAt: formatCommentTime(comment.createdAt)
      };
      commentsByDiary.set(comment.moodDiaryId, [...(commentsByDiary.get(comment.moodDiaryId) || []), value]);
    });

    const data = list.map((item) => {
      const author = userMap.get(item.userId);
      return {
        id: item.id,
        date: toDateString(item.date),
        moodId: item.moodId,
        content: item.content || '',
        userId: item.userId,
        isBySelf: item.userId === req.userId,
        authorName: author?.currentName || '未知',
        authorAvatar: normalizeUrl(author?.currentAvatar || ''),
        readByMatched: item.userId === req.userId ? !!item.readByMatchedAt : true,
        comments: commentsByDiary.get(item.id) || []
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取心情日记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const diary = await MoodDiary.findByPk(req.query.diaryId);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    if (!(await canAccessDiary(req.userId, diary))) return res.status(403).json({ success: false, message: '无权查看' });
    const comments = await MoodDiaryComment.findAll({ where: { moodDiaryId: diary.id }, order: [['createdAt', 'ASC']] });
    const users = comments.length
      ? await User.findAll({ where: { id: { [Op.in]: [...new Set(comments.map((item) => item.userId))] } }, attributes: ['id', 'currentName'] })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    res.json({ success: true, data: comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      authorName: userMap.get(comment.userId)?.currentName || '未知',
      content: comment.content,
      createdAt: formatCommentTime(comment.createdAt)
    })) });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/comment', async (req, res) => {
  try {
    const content = validateOptionalText(req.body?.content, 500);
    if (content.error) return res.status(400).json({ success: false, message: '评论不能超过 500 个字符' });
    if (!req.body?.diaryId || !content.value) return res.status(400).json({ success: false, message: '缺少 diaryId 或 content' });
    const diary = await MoodDiary.findByPk(req.body.diaryId);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    if (!(await canAccessDiary(req.userId, diary))) return res.status(403).json({ success: false, message: '无权评论' });
    const row = await MoodDiaryComment.create({ moodDiaryId: diary.id, userId: req.userId, content: content.value });
    res.status(201).json({ success: true, message: '评论成功', data: row });
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/entry', async (req, res) => {
  const date = String(req.query.date || '');
  if (!isValidDateOnly(date)) return res.status(400).json({ success: false, message: 'date 参数无效' });
  const membership = await getActiveMembership(req.userId);
  const entry = await MoodDiary.findOne({ where: { userId: req.userId, coupleId: membership.couple?.id || null, date } });
  res.json({ success: true, data: entry ? { date, moodId: entry.moodId, content: entry.content || '' } : null });
});

router.post('/', async (req, res) => {
  const date = String(req.body?.date || '');
  const moodId = String(req.body?.moodId || '');
  const content = validateOptionalText(req.body?.content, 5000);
  if (content.error) return res.status(400).json({ success: false, message: '日记内容不能超过 5000 个字符' });
  if (!isValidDateOnly(date) || parseDateOnly(date) > new Date()) return res.status(400).json({ success: false, message: 'date 无效' });
  if (!MOOD_IDS.has(moodId)) return res.status(400).json({ success: false, message: 'moodId 无效' });
  const membership = await getActiveMembership(req.userId);
  if (!membership.couple) return res.status(409).json({ success: false, message: '请先完成匹配' });
  try {
    const [entry, created] = await MoodDiary.findOrCreate({
      where: { userId: req.userId, coupleId: membership.couple.id, date },
      defaults: { moodId, content: content.value || null }
    });
    if (!created) await entry.update({ moodId, content: content.value || null });
    res.status(created ? 201 : 200).json({ success: true, message: created ? '保存成功' : '更新成功', data: entry });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      await MoodDiary.update({ moodId, content: content.value || null }, { where: { userId: req.userId, coupleId: membership.couple.id, date } });
      return res.json({ success: true, message: '更新成功' });
    }
    console.error('保存日记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const diary = await MoodDiary.findByPk(req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    if (diary.userId !== req.userId) return res.status(403).json({ success: false, message: '只能删除自己的日记' });
    await MoodDiaryComment.destroy({ where: { moodDiaryId: diary.id } });
    await diary.destroy();
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除日记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
