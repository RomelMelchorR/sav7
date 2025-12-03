const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const JWT_SECRET = env.JWT_SECRET;

function requireAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [, token] = auth.split(' ');
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = {
  requireAuth,
  JWT_SECRET,
};
