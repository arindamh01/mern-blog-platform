const postService = require('../services/post.service');
const { sendResponse } = require('../utils/apiResponse');

async function list(req, res) {
  const { items, meta } = await postService.listPublished(req.query);
  return sendResponse(res, { data: items, meta });
}

async function listMine(req, res) {
  const { items, meta } = await postService.listByAuthor(req.user._id, req.query);
  return sendResponse(res, { data: items, meta });
}

async function getBySlug(req, res) {
  const post = await postService.getBySlug(req.params.slug);
  return sendResponse(res, { data: post });
}

async function create(req, res) {
  const post = await postService.create(req.body, req.user);
  res.locals.activity = { targetId: post._id, metadata: { title: post.title } };
  return sendResponse(res, { statusCode: 201, message: 'Post created', data: post });
}

async function update(req, res) {
  const post = await postService.update(req.params.id, req.body, req.user);
  return sendResponse(res, { message: 'Post updated', data: post });
}

async function remove(req, res) {
  await postService.softDelete(req.params.id, req.user);
  return sendResponse(res, { message: 'Post deleted' });
}

module.exports = { list, listMine, getBySlug, create, update, remove };
