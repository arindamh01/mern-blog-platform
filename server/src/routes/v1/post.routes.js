const { Router } = require('express');
const postController = require('../../controllers/post.controller');
const commentController = require('../../controllers/comment.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const { logActivity } = require('../../middleware/activityLogger');
const postSchemas = require('../../validators/post.validator');
const commentSchemas = require('../../validators/comment.validator');
const { ACTIVITY_ACTIONS } = require('../../utils/constants');

const router = Router();

router
  .route('/')
  .get(validate(postSchemas.list), postController.list)
  .post(
    authenticate,
    validate(postSchemas.create),
    logActivity(ACTIVITY_ACTIONS.POST_CREATE, { targetType: 'Post' }),
    postController.create,
  );

router.get('/:slug',validate(postSchemas.getBySlug), postController.getBySlug);

router
  .route('/:id')
  .patch(
    authenticate,
    validate(postSchemas.update),
    logActivity(ACTIVITY_ACTIONS.POST_UPDATE, { targetType: 'Post' }),
    postController.update,
  )
  .delete(
    authenticate,
    validate(postSchemas.remove),
    logActivity(ACTIVITY_ACTIONS.POST_DELETE, { targetType: 'Post' }),
    postController.remove,
  );

router
  .route('/:postId/comments')
  .get(validate(commentSchemas.listForPost), commentController.listForPost)
  .post(
    authenticate,
    validate(commentSchemas.create),
    logActivity(ACTIVITY_ACTIONS.COMMENT_CREATE, { targetType: 'Comment' }),
    commentController.create,
  );

module.exports = router;
