const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function getPagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { getPagination, buildMeta, DEFAULT_LIMIT, MAX_LIMIT };
