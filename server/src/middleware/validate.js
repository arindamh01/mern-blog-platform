const ApiError = require('../utils/ApiError');

const SOURCES = ['body', 'params', 'query'];

function formatIssues(issues, source) {
  return issues.map((issue) => ({
    field: [source, ...issue.path].join('.'),
    message: issue.message,
  }));
}

function validate(schemas) {
  return (req, _res, next) => {
    const errors = [];

    SOURCES.forEach((source) => {
      if (!schemas[source]) return;
      const result = schemas[source].safeParse(req[source] ?? {});
      if (!result.success) {
        errors.push(...formatIssues(result.error.issues, source));
        return;
      }
      // Express 5 exposes req.query as a getter, so override it on the instance.
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    });

    if (errors.length) return next(ApiError.validation(errors));
    return next();
  };
}

module.exports = validate;
