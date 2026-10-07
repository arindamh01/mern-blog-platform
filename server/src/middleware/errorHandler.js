const mongoose = require('mongoose');
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.validation(
      err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.validation(
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`A record with this ${field} already exists`);
  }

  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');

  return new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500) logger.error(err);

  const body = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details) body.error.details = apiError.details;
  if (!env.isProduction && !(err instanceof ApiError) && apiError.statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(apiError.statusCode).json(body);
}

function notFound(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = { errorHandler, notFound, normalizeError };
