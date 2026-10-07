const { Router } = require('express');
const postController = require('../../controllers/post.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const postSchemas = require('../../validators/post.validator');

const router = Router();

router.get('/me/posts', authenticate, validate(postSchemas.list), postController.listMine);

module.exports = router;
