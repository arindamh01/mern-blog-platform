const crypto = require('crypto');
const slugify = require('slugify');

function toSlug(text) {
  const base = slugify(String(text), { lower: true, strict: true, trim: true }).slice(0, 80);
  return base || 'post';
}

function randomSuffix(length = 6) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

async function generateUniqueSlug(text, exists, maxAttempts = 5) {
  const base = toSlug(text);
  if (!(await exists(base))) return base;

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = `${base}-${randomSuffix()}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

module.exports = { toSlug, generateUniqueSlug };
