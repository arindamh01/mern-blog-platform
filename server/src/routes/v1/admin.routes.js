const { Router } = require('express');
const controller = require('../../controllers/admin.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { logActivity } = require('../../middleware/activityLogger');
const schemas = require('../../validators/admin.validator');
const { ROLES, ACTIVITY_ACTIONS } = require('../../utils/constants');

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', controller.stats);

router.get('/users', validate(schemas.listUsers), controller.listUsers);
router
  .route('/users/:id')
  .patch(
    validate(schemas.updateUser),
    logActivity(ACTIVITY_ACTIONS.USER_UPDATE, { targetType: 'User' }),
    controller.updateUser,
  )
  .delete(
    validate(schemas.byId),
    logActivity(ACTIVITY_ACTIONS.USER_DELETE, { targetType: 'User' }),
    controller.deleteUser,
  );

router.get('/posts', validate(schemas.listPosts), controller.listPosts);
router.patch(
  '/posts/:id/restore',
  validate(schemas.byId),
  logActivity(ACTIVITY_ACTIONS.POST_RESTORE, { targetType: 'Post' }),
  controller.restorePost,
);
router.delete(
  '/posts/:id',
  validate(schemas.byId),
  logActivity(ACTIVITY_ACTIONS.POST_DELETE, { targetType: 'Post' }),
  controller.softDeletePost,
);
router.delete(
  '/posts/:id/permanent',
  validate(schemas.byId),
  logActivity(ACTIVITY_ACTIONS.POST_DELETE, { targetType: 'Post' }),
  controller.hardDeletePost,
);

router.get('/comments', validate(schemas.listComments), controller.listComments);
router.delete(
  '/comments/:id',
  validate(schemas.byId),
  logActivity(ACTIVITY_ACTIONS.COMMENT_DELETE, { targetType: 'Comment' }),
  controller.deleteComment,
);

router.get('/activity-logs', validate(schemas.listActivity), controller.listActivity);

module.exports = router;
