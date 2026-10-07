const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const limitExceeded = (message) => (_req, res, _next, options) =>
  res.status(options.statusCode).json({
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message },
  });

function createAuthLimiter({
  max = env.AUTH_RATE_LIMIT_MAX,
  windowMs,
  skipSuccessfulRequests = false,
} = {}) {
  return rateLimit({
    windowMs: windowMs ?? env.AUTH_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    limit: max,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: limitExceeded('Too many authentication attempts, please try again later'),
  });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: limitExceeded('Too many requests, please slow down'),
});

module.exports = { createAuthLimiter, apiLimiter };
