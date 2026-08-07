const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string' ? authorization.match(/^Bearer ([^\s]+)$/) : null;
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    const token = match[1];

    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'wx-we-love-api',
      audience: 'wx-we-love-app'
    });
    if (!Number.isInteger(decoded.userId)) throw new Error('Invalid token subject');
    // Load the fields used by protected routes once. The tokenVersion check is
    // intentionally kept so logout/revocation remains effective.
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['sessionKey'] }
    });
    if (!user || decoded.tokenVersion !== user.tokenVersion) throw new Error('Revoked token');
    req.userId = decoded.userId;
    req.authUser = user;
    next();
  } catch (error) {
    if (error.code === 'CONFIGURATION_ERROR') {
      return res.status(503).json({ success: false, message: 'Authentication is unavailable' });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = authMiddleware;
