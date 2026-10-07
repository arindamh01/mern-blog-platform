const { Router } = require('express');
const authRoutes = require('./auth.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const { sendResponse } = require('../../utils/apiResponse');

function v1Router(options = {}) {
  const router = Router();

  router.get('/health', (_req, res) =>
    sendResponse(res, { message: 'API is healthy', data: { uptime: process.uptime() } }),
  );

  router.use('/auth', authRoutes(options.auth));
  router.use('/posts', postRoutes);
  router.use('/comments', commentRoutes);
  router.use('/users', userRoutes);
  router.use('/admin', adminRoutes);

  return router;
}

module.exports = v1Router;
