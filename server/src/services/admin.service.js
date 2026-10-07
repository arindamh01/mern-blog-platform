const { User, Post, Comment, ActivityLog } = require('../models');
const { ROLES } = require('../utils/constants');

async function getStats() {
  const [totalUsers, totalAdmins, totalPosts, deletedPosts, totalComments, recentActivity] =
    await Promise.all([
      User.estimatedDocumentCount(),
      User.countDocuments({ role: ROLES.ADMIN }),
      Post.countDocuments({ isDeleted: false }),
      Post.countDocuments({ isDeleted: true }),
      Comment.estimatedDocumentCount(),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('action targetType targetId createdAt user')
        .populate('user', 'name')
        .lean(),
    ]);

  return {
    totalUsers,
    totalAdmins,
    totalPosts,
    deletedPosts,
    totalComments,
    recentActivity,
  };
}

module.exports = { getStats };
