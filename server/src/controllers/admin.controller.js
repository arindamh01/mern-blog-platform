const adminService = require('../services/admin.service');
const userService = require('../services/user.service');
const postService = require('../services/post.service');
const commentService = require('../services/comment.service');
const activityService = require('../services/activity.service');
const { sendResponse } = require('../utils/apiResponse');

async function stats(_req, res) {
  const data = await adminService.getStats();
  return sendResponse(res, { data });
}

async function listUsers(req, res) {
  const { items, meta } = await userService.list(req.query);
  return sendResponse(res, { data: items, meta });
}

async function updateUser(req, res) {
  const user = await userService.update(req.params.id, req.body, req.user);
  res.locals.activity = { metadata: req.body };
  return sendResponse(res, { message: 'User updated', data: user });
}

async function deleteUser(req, res) {
  await userService.remove(req.params.id, req.user);
  return sendResponse(res, { message: 'User deleted' });
}

async function listPosts(req, res) {
  const { items, meta } = await postService.listAll(req.query);
  return sendResponse(res, { data: items, meta });
}

async function restorePost(req, res) {
  const post = await postService.restore(req.params.id);
  return sendResponse(res, { message: 'Post restored', data: post });
}

async function softDeletePost(req, res) {
  await postService.softDelete(req.params.id, req.user);
  return sendResponse(res, { message: 'Post deleted' });
}

async function hardDeletePost(req, res) {
  await postService.hardDelete(req.params.id);
  res.locals.activity = { metadata: { permanent: true } };
  return sendResponse(res, { message: 'Post permanently deleted' });
}

async function listComments(req, res) {
  const { items, meta } = await commentService.listAll(req.query);
  return sendResponse(res, { data: items, meta });
}

async function deleteComment(req, res) {
  await commentService.remove(req.params.id, req.user);
  return sendResponse(res, { message: 'Comment deleted' });
}

async function listActivity(req, res) {
  const { items, meta } = await activityService.list(req.query);
  return sendResponse(res, { data: items, meta });
}

module.exports = {
  stats,
  listUsers,
  updateUser,
  deleteUser,
  listPosts,
  restorePost,
  softDeletePost,
  hardDeletePost,
  listComments,
  deleteComment,
  listActivity,
};
