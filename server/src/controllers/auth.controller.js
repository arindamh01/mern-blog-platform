const passport = require('passport');
const env = require('../config/env');
const authService = require('../services/auth.service');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const { sendResponse } = require('../utils/apiResponse');
const { REFRESH_COOKIE_NAME, ACTIVITY_ACTIONS } = require('../utils/constants');
const { requestContext } = require('../middleware/activityLogger');

const REFRESH_COOKIE_PATH = '/api/v1/auth';

function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  };
}

function sendSession(res, session, { statusCode = 200, message }) {
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(session.refreshExpiresAt));
  return sendResponse(res, {
    statusCode,
    message,
    data: { user: session.user, accessToken: session.accessToken },
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), expires: undefined });
}

async function register(req, res) {
  const session = await authService.register(req.body, { ip: req.ip });
  res.locals.activity = { user: session.user._id, targetType: 'User', targetId: session.user._id };
  notificationService.notifyAdminsNewUser(session.user);
  return sendSession(res, session, { statusCode: 201, message: 'Registration successful' });
}

async function login(req, res) {
  const session = await authService.login(req.body, { ip: req.ip });
  res.locals.activity = { user: session.user._id, targetType: 'User', targetId: session.user._id };
  return sendSession(res, session, { message: 'Login successful' });
}

async function refresh(req, res) {
  try {
    const session = await authService.refresh(req.cookies[REFRESH_COOKIE_NAME], { ip: req.ip });
    return sendSession(res, session, { message: 'Token refreshed' });
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

async function logout(req, res) {
  await authService.logout(req.cookies[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  return sendResponse(res, { message: 'Logged out' });
}

async function me(req, res) {
  const user = await authService.getMe(req.user._id);
  return sendResponse(res, { data: { user } });
}

const redirectToLoginWithError = (res, reason) =>
  res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(reason)}`);

function oauthStart(provider, label, enabled, scope) {
  return (req, res, next) => {
    if (!enabled) return redirectToLoginWithError(res, `${label} login is not configured`);
    return passport.authenticate(provider, { scope, session: false })(req, res, next);
  };
}

function oauthCallback(provider, label, enabled) {
  return (req, res, next) => {
    if (!enabled) return redirectToLoginWithError(res, `${label} login is not configured`);
    return passport.authenticate(provider, { session: false }, async (err, user) => {
      const failure = (reason) => redirectToLoginWithError(res, reason);

      if (err || !user) return failure(err?.message || 'OAuth login failed');

      try {
        const session = await authService.oauthLogin(user, { ip: req.ip });
        activityService.log({
          user: user._id,
          action: ACTIVITY_ACTIONS.OAUTH_LOGIN,
          targetType: 'User',
          targetId: user._id,
          metadata: { provider },
          ...requestContext(req),
        });
        res.cookie(
          REFRESH_COOKIE_NAME,
          session.refreshToken,
          refreshCookieOptions(session.refreshExpiresAt),
        );
        return res.redirect(`${env.CLIENT_URL}/oauth/callback`);
      } catch (loginErr) {
        return failure(loginErr.message);
      }
    })(req, res, next);
  };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  googleStart: oauthStart('google', 'Google', env.googleEnabled, ['profile', 'email']),
  googleCallback: oauthCallback('google', 'Google', env.googleEnabled),
  facebookStart: oauthStart('facebook', 'Facebook', env.facebookEnabled, ['email']),
  facebookCallback: oauthCallback('facebook', 'Facebook', env.facebookEnabled),
};
