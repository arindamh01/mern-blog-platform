const { ActivityLog } = require('../models');
const logger = require('../utils/logger');
const { getPagination, buildMeta } = require('../utils/pagination');

async function log({ user, action, targetType, targetId, ip, userAgent, metadata }) {
  try {
    await ActivityLog.create({ user, action, targetType, targetId, ip, userAgent, metadata });
  } catch (err) {
    logger.error('Failed to write activity log', err.message);
  }
}

async function list(query = {}) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.user) filter.user = query.user;

  const [items, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('user', 'name email')
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(pagination, total) };
}

module.exports = { log, list };
