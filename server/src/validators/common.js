const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' });

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  search: z.string().trim().max(100).optional(),
});

const idParams = z.object({ id: objectId });

module.exports = { z, objectId, booleanString, paginationQuery, idParams };
