const { Router } = require('express');
const controller = require('../../controllers/comment.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const { logActivity } = require('../../middleware/activityLogger');
const schemas = require('../../validators/comment.validator');
const { ACTIVITY_ACTIONS } = require('../../utils/constants');

const router = Router();

router.use(authenticate);

router
  .route('/:id')
  .patch(
    validate(schemas.update),
    logActivity(ACTIVITY_ACTIONS.COMMENT_UPDATE, { targetType: 'Comment' }),
    controller.update,
  )
  .delete(
    validate(schemas.remove),
    logActivity(ACTIVITY_ACTIONS.COMMENT_DELETE, { targetType: 'Comment' }),
    controller.remove,
  );

module.exports = router;
