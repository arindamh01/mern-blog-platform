const { Post, Comment } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUniqueSlug } = require('../utils/slug');
const { getPagination, buildMeta } = require('../utils/pagination');
const { assertOwnerOrAdmin } = require('../utils/permissions');
const notificationService = require('./notification.service');

const AUTHOR_FIELDS = 'name avatar';
const EXCERPT_LENGTH = 220;
const LIST_PROJECTION = {
  title: 1,
  slug: 1,
  author: 1,
  createdAt: 1,
  updatedAt: 1,
  isDeleted: 1,
  deletedAt: 1,
  excerpt: { $substrCP: ['$content', 0, EXCERPT_LENGTH] },
};

const slugExists = (slug) => Post.exists({ slug });

function buildFilter({ search, author, includeDeleted = false } = {}) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (author) filter.author = author;
  if (search) filter.$text = { $search: search };
  return filter;
}

async function paginate(filter, query) {
  const pagination = getPagination(query);
  const [items, total] = await Promise.all([
    Post.find(filter, LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(pagination, total) };
}

async function findActiveById(id) {
  const post = await Post.findOne({ _id: id, isDeleted: false });
  if (!post) throw ApiError.notFound('Post');
  return post;
}

function listPublished(query = {}) {
  return paginate(buildFilter({ search: query.search, author: query.author }), query);
}

function listByAuthor(authorId, query = {}) {
  return paginate(buildFilter({ author: authorId, search: query.search }), query);
}

function listAll(query = {}) {
  const filter = buildFilter({
    search: query.search,
    author: query.author,
    includeDeleted: query.includeDeleted,
  });
  if (query.onlyDeleted) filter.isDeleted = true;
  return paginate(filter, query);
}

async function getBySlug(slug) {
  const post = await Post.findOne({ slug, isDeleted: false })
    .select('-isDeleted -deletedAt -deletedBy -__v')
    .populate('author', AUTHOR_FIELDS)
    .lean();
  if (!post) throw ApiError.notFound('Post');

  post.commentCount = await Comment.countDocuments({ post: post._id });
  return post;
}

async function create({ title, content }, actor) {
  const slug = await generateUniqueSlug(title, slugExists);
  const post = await Post.create({ title, content, slug, author: actor._id });

  notificationService.notifyAdminsNewPost({ post, author: actor });
  return post.populate('author', AUTHOR_FIELDS);
}

async function update(id, changes, actor) {
  const post = await findActiveById(id);
  assertOwnerOrAdmin(post, actor, 'You can only edit your own posts');

  if (changes.title !== undefined && changes.title !== post.title) {
    post.title = changes.title;
    post.slug = await generateUniqueSlug(changes.title, slugExists);
  }
  if (changes.content !== undefined) post.content = changes.content;

  await post.save();
  return post.populate('author', AUTHOR_FIELDS);
}

async function softDelete(id, actor) {
  const post = await findActiveById(id);
  assertOwnerOrAdmin(post, actor, 'You can only delete your own posts');

  post.isDeleted = true;
  post.deletedAt = new Date();
  post.deletedBy = actor._id;
  await post.save();
  return post;
}

async function restore(id) {
  const post = await Post.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { $set: { isDeleted: false, deletedAt: null, deletedBy: null } },
    { new: true },
  );
  if (!post) throw ApiError.notFound('Deleted post');
  return post;
}

async function hardDelete(id) {
  const post = await Post.findByIdAndDelete(id);
  if (!post) throw ApiError.notFound('Post');
  await Comment.deleteMany({ post: id });
  return post;
}

module.exports = {
  listPublished,
  listByAuthor,
  listAll,
  getBySlug,
  findActiveById,
  create,
  update,
  softDelete,
  restore,
  hardDelete,
};
