const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { AUTH_PROVIDERS } = require('../utils/constants');
const tokenService = require('./token.service');

async function buildSession(user, { ip } = {}) {
  const accessToken = tokenService.signAccessToken(user);
  const { token: refreshToken, expiresAt } = await tokenService.issueRefreshToken(user._id, { ip });
  return { user, accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

async function register({ name, email, password }, { ip } = {}) {
  const existing = await User.exists({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, provider: AUTH_PROVIDERS.LOCAL });
  return buildSession(user, { ip });
}

async function login({ email, password }, { ip } = {}) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const valid = user && (await user.comparePassword(password));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save();
  return buildSession(user, { ip });
}

async function findOrCreateOAuthUser({ provider, providerId, email, name, avatar }) {
  let user = await User.findOne({ provider, providerId });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      if (!user.avatar && avatar) user.avatar = avatar;
      return user;
    }
  }

  if (!email) throw ApiError.badRequest(`Your ${provider} account did not share an email address`);

  return User.create({ name: name || email.split('@')[0], email, provider, providerId, avatar });
}

async function oauthLogin(user, { ip } = {}) {
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  user.lastLoginAt = new Date();
  await user.save();
  return buildSession(user, { ip });
}

async function refresh(refreshToken, { ip } = {}) {
  const { userId, refreshToken: nextToken, expiresAt } = await tokenService.rotateRefreshToken(
    refreshToken,
    { ip },
  );
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    await tokenService.revokeAllForUser(userId);
    throw ApiError.unauthorized('Account unavailable');
  }
  return {
    user,
    accessToken: tokenService.signAccessToken(user),
    refreshToken: nextToken,
    refreshExpiresAt: expiresAt,
  };
}

async function logout(refreshToken) {
  await tokenService.revokeRefreshToken(refreshToken);
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User');
  return user;
}

module.exports = { register, login, findOrCreateOAuthUser, oauthLogin, refresh, logout, getMe };
