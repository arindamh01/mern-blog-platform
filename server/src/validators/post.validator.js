const { z, objectId, idParams, paginationQuery } = require('./common');

const title = z.string().trim().min(3, 'Title must be at least 3 characters').max(200);
const content = z.string().trim().min(10, 'Content must be at least 10 characters').max(50000);

const list = {
  query: paginationQuery.extend({ author: objectId.optional() }),
};

const getBySlug = {
  params: z.object({ slug: z.string().trim().min(1).max(120) }),
};

const create = {
  body: z.object({ title, content }),
};

const update = {
  params: idParams,
  body: z
    .object({ title: title.optional(), content: content.optional() })
    .refine((data) => data.title !== undefined || data.content !== undefined, {
      message: 'Provide at least one of title or content',
    }),
};

const remove = { params: idParams };

module.exports = { list, getBySlug, create, update, remove };
