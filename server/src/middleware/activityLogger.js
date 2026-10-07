const activityService = require('../services/activity.service');

function requestContext(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

function logActivity(action, { targetType } = {}) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const extra = res.locals.activity || {};
      const user = extra.user || req.user?._id;
      if (!user) return;

      activityService.log({
        user,
        action,
        targetType: extra.targetType || targetType,
        targetId: extra.targetId || req.params.id,
        metadata: extra.metadata,
        ...requestContext(req),
      });
    });
    next();
  };
}

module.exports = { logActivity, requestContext };
