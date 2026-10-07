const { User, Post, Comment } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const tokenService = require('./token.service');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function list(query = {}) {
  const pagination = getPagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('name email role provider avatar isActive lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(pagination, total) };
}

async function update(id, { role, isActive, name }, actor) {
  const isSelf = String(id) === String(actor._id);
  if (isSelf && (role !== undefined || isActive === false)) {
    throw ApiError.badRequest('You cannot change your own role or deactivate yourself');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User');

  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (name !== undefined) user.name = name;
  await user.save();

  if (isActive === false || role !== undefined) await tokenService.revokeAllForUser(user._id);
  return user;
}

async function remove(id, actor) {
  if (String(id) === String(actor._id)) throw ApiError.badRequest('You cannot delete yourself');

  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notFound('User');

  const now = new Date();
  await Promise.all([
    tokenService.revokeAllForUser(user._id),
    Comment.deleteMany({ author: user._id }),
    Post.updateMany(
      { author: user._id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: now, deletedBy: actor._id } },
    ),
  ]);
  return user;
}

module.exports = { list, update, remove };
