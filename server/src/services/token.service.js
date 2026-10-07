const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { RefreshToken } = require('../models');
const ApiError = require('../utils/ApiError');

const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

async function issueRefreshToken(userId, { family = crypto.randomUUID(), ip } = {}) {
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * DAY_MS);
  const token = jwt.sign({ sub: String(userId), fam: family }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d`,
    jwtid: crypto.randomUUID(),
  });

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(token),
    family,
    expiresAt,
    createdByIp: ip,
  });

  return { token, expiresAt };
}

async function rotateRefreshToken(token, { ip } = {}) {
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  try {
    jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored) throw ApiError.unauthorized('Invalid refresh token');

  if (stored.revokedAt) {
    await revokeFamily(stored.family);
    throw ApiError.unauthorized('Refresh token reuse detected; please log in again');
  }

  if (stored.expiresAt <= new Date()) throw ApiError.unauthorized('Refresh token expired');

  const next = await issueRefreshToken(stored.user, { family: stored.family, ip });
  stored.revokedAt = new Date();
  stored.replacedByHash = hashToken(next.token);
  await stored.save();

  return { userId: stored.user, refreshToken: next.token, expiresAt: next.expiresAt };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(token), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeFamily(family) {
  await RefreshToken.updateMany(
    { family, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

module.exports = {
  hashToken,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeFamily,
  revokeAllForUser,
};
