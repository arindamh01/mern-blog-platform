const { z, objectId, idParams, paginationQuery, booleanString } = require('./common');
const { ROLES, ACTIVITY_ACTIONS } = require('../utils/constants');

const listUsers = {
  query: paginationQuery.extend({ role: z.enum(Object.values(ROLES)).optional() }),
};

const updateUser = {
  params: idParams,
  body: z
    .object({
      role: z.enum(Object.values(ROLES)).optional(),
      isActive: z.boolean().optional(),
      name: z.string().trim().min(2).max(80).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' }),
};

const listPosts = {
  query: paginationQuery.extend({
    author: objectId.optional(),
    includeDeleted: booleanString.optional(),
    onlyDeleted: booleanString.optional(),
  }),
};

const listComments = {
  query: paginationQuery.extend({ post: objectId.optional(), author: objectId.optional() }),
};

const listActivity = {
  query: paginationQuery.extend({
    action: z.enum(Object.values(ACTIVITY_ACTIONS)).optional(),
    user: objectId.optional(),
  }),
};

const byId = { params: idParams };

module.exports = { listUsers, updateUser, listPosts, listComments, listActivity, byId };
