const { Router } = require('express');
const env = require('../../config/env');
const controller = require('../../controllers/auth.controller');
const validate = require('../../middleware/validate');
const { authenticate, optionalAuth } = require('../../middleware/authenticate');
const { logActivity } = require('../../middleware/activityLogger');
const { createAuthLimiter } = require('../../middleware/rateLimiter');
const schemas = require('../../validators/auth.validator');
const { ACTIVITY_ACTIONS } = require('../../utils/constants');

const SESSION_LIMIT_MULTIPLIER = 10;

function authRoutes({ rateLimit = {} } = {}) {
  const router = Router();
  const registerLimiter = createAuthLimiter(rateLimit);
  const loginLimiter = createAuthLimiter({ ...rateLimit, skipSuccessfulRequests: true });
  const sessionLimiter = createAuthLimiter({
    ...rateLimit,
    max: (rateLimit.max ?? env.AUTH_RATE_LIMIT_MAX) * SESSION_LIMIT_MULTIPLIER,
  });

  router.post(
    '/register',
    registerLimiter,
    validate(schemas.register),
    logActivity(ACTIVITY_ACTIONS.REGISTER),
    controller.register,
  );
  router.post(
    '/login',
    loginLimiter,
    validate(schemas.login),
    logActivity(ACTIVITY_ACTIONS.LOGIN),
    controller.login,
  );
  router.post('/refresh', sessionLimiter, controller.refresh);
  router.post('/logout', optionalAuth, logActivity(ACTIVITY_ACTIONS.LOGOUT), controller.logout);
  router.get('/me', authenticate, controller.me);

  router.get('/google', sessionLimiter, controller.googleStart);
  router.get('/google/callback', controller.googleCallback);
  router.get('/facebook', sessionLimiter, controller.facebookStart);
  router.get('/facebook/callback', controller.facebookCallback);

  return router;
}

module.exports = authRoutes;
