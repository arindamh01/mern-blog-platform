const commentService = require('../services/comment.service');
const { sendResponse } = require('../utils/apiResponse');

async function listForPost(req, res) {
  const { items, meta } = await commentService.listForPost(req.params.postId, req.query);
  return sendResponse(res, { data: items, meta });
}

async function create(req, res) {
  const comment = await commentService.create(req.params.postId, req.body, req.user);
  res.locals.activity = { targetId: comment._id, metadata: { post: req.params.postId } };
  return sendResponse(res, { statusCode: 201, message: 'Comment added', data: comment });
}

async function update(req, res) {
  const comment = await commentService.update(req.params.id, req.body, req.user);
  return sendResponse(res, { message: 'Comment updated', data: comment });
}

async function remove(req, res) {
  await commentService.remove(req.params.id, req.user);
  return sendResponse(res, { message: 'Comment deleted' });
}

module.exports = { listForPost, create, update, remove };
