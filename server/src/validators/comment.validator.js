const { z, objectId, idParams, paginationQuery } = require('./common');

const content = z.string().trim().min(1, 'Comment cannot be empty').max(2000);
const postParams = z.object({ postId: objectId });

const listForPost = { params: postParams, query: paginationQuery };

const create = { params: postParams, body: z.object({ content }) };

const update = { params: idParams, body: z.object({ content }) };

const remove = { params: idParams };

module.exports = { listForPost, create, update, remove };
