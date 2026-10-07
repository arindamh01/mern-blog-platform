const { Comment } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { assertOwnerOrAdmin } = require('../utils/permissions');
const postService = require('./post.service');
const notificationService = require('./notification.service');

const AUTHOR_FIELDS = 'name avatar';

async function paginate(filter, query, populatePost = false) {
  const pagination = getPagination(query);
  let cursor = Comment.find(filter)
    .select('-__v')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .populate('author', AUTHOR_FIELDS);
  if (populatePost) cursor = cursor.populate('post', 'title slug isDeleted');

  const [items, total] = await Promise.all([cursor.lean(), Comment.countDocuments(filter)]);
  return { items, meta: buildMeta(pagination, total) };
}

async function listForPost(postId, query = {}) {
  await postService.findActiveById(postId);
  return paginate({ post: postId }, query);
}

function listAll(query = {}) {
  const filter = {};
  if (query.post) filter.post = query.post;
  if (query.author) filter.author = query.author;
  return paginate(filter, query, true);
}

async function findById(id) {
  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('Comment');
  return comment;
}

async function create(postId, { content }, actor) {
  const post = await postService.findActiveById(postId);
  const comment = await Comment.create({ content, post: post._id, author: actor._id });

  notificationService.notifyNewComment({ post, comment, commenter: actor });
  return comment.populate('author', AUTHOR_FIELDS);
}

async function update(id, { content }, actor) {
  const comment = await findById(id);
  assertOwnerOrAdmin(comment, actor, 'You can only edit your own comments');

  comment.content = content;
  await comment.save();
  return comment.populate('author', AUTHOR_FIELDS);
}

async function remove(id, actor) {
  const comment = await findById(id);
  assertOwnerOrAdmin(comment, actor, 'You can only delete your own comments');
  await comment.deleteOne();
  return comment;
}

module.exports = { listForPost, listAll, create, update, remove };
