const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/token.service');

const USER_FIELDS = 'name email role avatar isActive provider';

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function resolveUser(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    throw ApiError.unauthorized(message);
  }

  const user = await User.findById(payload.sub).select(USER_FIELDS).lean();
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  return user;
}

async function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await resolveUser(token);
  next();
}

async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

module.exports = { authenticate, optionalAuth };
