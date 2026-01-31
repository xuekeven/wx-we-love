const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const { User } = require('../models');

// 生成匹配码（6位数字）
function generateMatchCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 通过 code 换取 openId 和 session_key
function getOpenIdByCode(code) {
  return new Promise((resolve, reject) => {
    // 生产环境：需要配置小程序的 appid 和 secret
    const appid = process.env.WX_APPID || '';
    const secret = process.env.WX_SECRET || '';
    
    if (!appid || !secret) {
      // 开发环境：如果没有配置，使用 code 作为 openId（仅用于开发测试）
      console.warn('⚠️  警告：未配置微信小程序 appid 和 secret，使用开发模式');
      resolve({ openId: code, sessionKey: null });
      return;
    }

    // 调用微信 API 换取 openId
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const { openid, session_key, errcode, errmsg } = result;

          if (errcode) {
            console.error('微信登录失败:', errmsg);
            reject(new Error(`微信登录失败: ${errmsg}`));
            return;
          }

          resolve({ openId: openid, sessionKey: session_key });
        } catch (error) {
          console.error('解析微信响应失败:', error);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('获取 openId 失败:', error);
      reject(error);
    });
  });
}

// 微信登录（code + 用户基本资料 + 可选uuid）
router.post('/login', async (req, res) => {
  try {
    const { code, nickname, avatar, uuid } = req.body; // 微信返回的 nickname/avatar 存入 currentName/currentAvatar
    
    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }

    // 通过 code 换取 openId 和 session_key
    let openId;
    let sessionKey = null;
    try {
      const result = await getOpenIdByCode(code);
      openId = result.openId;
      sessionKey = result.sessionKey || null;
    } catch (error) {
      console.error('获取 openId 失败:', error);
      return res.status(500).json({ 
        success: false, 
        message: '微信登录失败，请重试' 
      });
    }

    if (!openId) {
      return res.status(400).json({ 
        success: false, 
        message: '获取用户标识失败' 
      });
    }

    // 查找或创建用户
    let user = await User.findOne({ where: { openId } });
    
    if (!user) {
      // 生成匹配码
      let matchCode = generateMatchCode();
      // 确保匹配码唯一
      while (await User.findOne({ where: { matchCode } })) {
        matchCode = generateMatchCode();
      }

      user = await User.create({
        openId,
        uuid: uuid || null,
        currentName: nickname || '微信用户',
        currentAvatar: avatar || '',
        sessionKey,
        matchCode,
        isMatched: false,
        functionOrder: {
          '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
        }
      });
    } else {
      // 更新昵称、头像、uuid、sessionKey（如果提供了）
      if (nickname !== undefined) user.currentName = nickname;
      if (avatar !== undefined) user.currentAvatar = avatar;
      if (uuid) user.uuid = uuid;
      if (sessionKey) user.sessionKey = sessionKey;
      await user.save();
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, openId: user.openId },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          openId: user.openId,
          uuid: user.uuid,
          currentName: user.currentName,
          currentAvatar: user.currentAvatar,
          phone: user.phone,
          matchCode: user.matchCode,
          isMatched: user.isMatched,
          matchedUserId: user.matchedUserId
        },
        token
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取当前用户信息（需要token）
router.get('/info', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 如果已匹配，获取匹配对象的信息
      let matchedUser = null;
      if (user.isMatched && user.matchedUserId) {
        matchedUser = await User.findByPk(user.matchedUserId);
      }

      // 统一属性名：当前用户 currentName/currentAvatar，匹配对象 matchedName/matchedAvatar
      res.json({
        success: true,
        data: {
          id: user.id,
          openId: user.openId,
          phone: user.phone,
          matchCode: user.matchCode,
          isMatched: user.isMatched,
          matchedUserId: user.matchedUserId,
          currentName: user.currentName || '',
          currentAvatar: user.currentAvatar || '',
          matchedName: matchedUser ? (matchedUser.currentName || '') : '',
          matchedAvatar: matchedUser ? (matchedUser.currentAvatar || '') : '',
          matchedUser: matchedUser ? { id: matchedUser.id } : null,
          loveDate: user.loveDate,
          functionOrder: user.functionOrder
        }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 生成匹配码
router.post('/generate-match-code', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      if (user.isMatched) {
        return res.status(400).json({ success: false, message: '已经匹配，无法生成新匹配码' });
      }

      // 生成新的匹配码
      let matchCode = generateMatchCode();
      while (await User.findOne({ where: { matchCode } })) {
        matchCode = generateMatchCode();
      }

      await user.update({ matchCode });

      res.json({
        success: true,
        message: '匹配码生成成功',
        data: { matchCode }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('生成匹配码失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 输入匹配码进行匹配
router.post('/match', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { matchCode } = req.body;
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    if (!matchCode) {
      return res.status(400).json({ success: false, message: '请输入匹配码' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const currentUser = await User.findByPk(decoded.userId);
      
      if (!currentUser) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      if (currentUser.isMatched) {
        return res.status(400).json({ success: false, message: '已经匹配，无法再次匹配' });
      }

      if (currentUser.matchCode === matchCode) {
        return res.status(400).json({ success: false, message: '不能使用自己的匹配码' });
      }

      // 查找匹配码对应的用户
      const targetUser = await User.findOne({ where: { matchCode } });
      
      if (!targetUser) {
        return res.status(404).json({ success: false, message: '匹配码不存在' });
      }

      if (targetUser.isMatched) {
        return res.status(400).json({ success: false, message: '该用户已经匹配' });
      }

      // 进行匹配
      await currentUser.update({
        isMatched: true,
        matchedUserId: targetUser.id
      });

      await targetUser.update({
        isMatched: true,
        matchedUserId: currentUser.id
      });

      res.json({
        success: true,
        message: '匹配成功',
        data: {
          matchedUser: {
            id: targetUser.id,
            currentName: targetUser.currentName,
            currentAvatar: targetUser.currentAvatar
          }
        }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('匹配失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户信息（接受 currentName、currentAvatar 等，统一映射到数据库字段）
router.post('/info', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const body = req.body;
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      const updates = {};
      if (body.currentName !== undefined) updates.currentName = body.currentName;
      if (body.currentAvatar !== undefined) updates.currentAvatar = body.currentAvatar;
      if (body.loveDate !== undefined) updates.loveDate = body.loveDate;
      if (body.functionOrder !== undefined) updates.functionOrder = body.functionOrder;
      await user.update(updates);
      
      res.json({
        success: true,
        message: '更新成功',
        data: {
          currentName: user.currentName,
          currentAvatar: user.currentAvatar,
          loveDate: user.loveDate,
          functionOrder: user.functionOrder
        }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新功能排序
router.post('/function-order', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { functionOrder } = req.body;
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      await user.update({ functionOrder });
      
      res.json({
        success: true,
        message: '排序已更新',
        data: user
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 绑定手机号（通过微信 getPhoneNumber 返回的 encryptedData + iv 解密）
router.post('/bind-phone', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { encryptedData, iv } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    if (!encryptedData || !iv) {
      return res.status(400).json({ success: false, message: '缺少encryptedData或iv' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      if (!user.sessionKey) {
        // 开发模式下可能没有配置 appid/secret，此时无法解密手机号
        return res.status(400).json({
          success: false,
          message: '当前环境未配置微信appid/secret，无法解密手机号'
        });
      }

      // 解密手机号
      try {
        const sessionKey = Buffer.from(user.sessionKey, 'base64');
        const ivBuffer = Buffer.from(iv, 'base64');
        const encryptedBuffer = Buffer.from(encryptedData, 'base64');

        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey, ivBuffer);
        decipher.setAutoPadding(true);
        let decodedStr = decipher.update(encryptedBuffer, 'binary', 'utf8');
        decodedStr += decipher.final('utf8');

        const phoneInfo = JSON.parse(decodedStr);
        const phoneNumber = phoneInfo.phoneNumber || phoneInfo.purePhoneNumber;

        if (!phoneNumber) {
          return res.status(400).json({ success: false, message: '解密手机号失败' });
        }

        await user.update({ phone: phoneNumber });

        res.json({
          success: true,
          message: '手机号绑定成功',
          data: {
            phone: phoneNumber
          }
        });
      } catch (error) {
        console.error('解密手机号失败:', error);
        return res.status(500).json({ success: false, message: '解密手机号失败' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('绑定手机号失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 解绑匹配关系
router.post('/unmatch', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const currentUser = await User.findByPk(decoded.userId);
      
      if (!currentUser) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      if (!currentUser.isMatched) {
        return res.status(400).json({ success: false, message: '当前未匹配，无需解绑' });
      }

      // 获取匹配的用户
      const matchedUser = currentUser.matchedUserId 
        ? await User.findByPk(currentUser.matchedUserId)
        : null;

      // 解除当前用户的匹配关系
      await currentUser.update({
        isMatched: false,
        matchedUserId: null
      });

      // 如果匹配的用户存在，也解除其匹配关系
      if (matchedUser && matchedUser.isMatched && matchedUser.matchedUserId === currentUser.id) {
        await matchedUser.update({
          isMatched: false,
          matchedUserId: null
        });
      }

      res.json({
        success: true,
        message: '解绑成功',
        data: {
          isMatched: false,
          matchedUserId: null
        }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }
  } catch (error) {
    console.error('解绑失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
