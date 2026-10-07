const ApiError = require('./ApiError');
const { ROLES } = require('./constants');

const isAdmin = (actor) => actor?.role === ROLES.ADMIN;

const isOwner = (resource, actor) =>
  Boolean(actor) && String(resource.author?._id || resource.author) === String(actor._id);

function assertOwnerOrAdmin(resource, actor, message) {
  if (!isOwner(resource, actor) && !isAdmin(actor)) throw ApiError.forbidden(message);
}

module.exports = { isAdmin, isOwner, assertOwnerOrAdmin };
