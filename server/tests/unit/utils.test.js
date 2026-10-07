const { toSlug, generateUniqueSlug } = require('../../src/utils/slug');
const { getPagination, buildMeta, MAX_LIMIT } = require('../../src/utils/pagination');
const { isOwner, assertOwnerOrAdmin } = require('../../src/utils/permissions');
const ApiError = require('../../src/utils/ApiError');

describe('slug utils', () => {
  it.each([
    ['Hello World', 'hello-world'],
    ['  MERN & Node.js: 2026 Guide!  ', 'mern-and-nodejs-2026-guide'],
    ['Ünïcödé Tïtle', 'unicode-title'],
    ['!!!', 'post'],
  ])('toSlug(%p) -> %p', (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });

  it('returns the base slug when it is free', async () => {
    await expect(generateUniqueSlug('My Post', async () => false)).resolves.toBe('my-post');
  });

  it('appends a random suffix on collision', async () => {
    const taken = new Set(['my-post']);
    const slug = await generateUniqueSlug('My Post', async (s) => taken.has(s));
    expect(slug).toMatch(/^my-post-[a-f0-9]{6}$/);
  });

  it('falls back to a timestamp suffix after repeated collisions', async () => {
    const slug = await generateUniqueSlug('My Post', async () => true, 2);
    expect(slug).toMatch(/^my-post-[a-z0-9]+$/);
  });
});

describe('pagination utils', () => {
  it('uses defaults for missing values', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('computes skip and clamps out-of-range values', () => {
    expect(getPagination({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, skip: 40 });
    expect(getPagination({ page: '-2', limit: '9999' })).toEqual({
      page: 1,
      limit: MAX_LIMIT,
      skip: 0,
    });
  });

  it('builds response meta', () => {
    expect(buildMeta({ page: 2, limit: 10 }, 35)).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      totalPages: 4,
    });
    expect(buildMeta({ page: 1, limit: 10 }, 0).totalPages).toBe(1);
  });
});

describe('permission utils', () => {
  const owner = { _id: 'u1', role: 'user' };
  const stranger = { _id: 'u2', role: 'user' };
  const admin = { _id: 'a1', role: 'admin' };

  it('detects ownership for populated and raw author refs', () => {
    expect(isOwner({ author: 'u1' }, owner)).toBe(true);
    expect(isOwner({ author: { _id: 'u1' } }, owner)).toBe(true);
    expect(isOwner({ author: 'u1' }, stranger)).toBe(false);
  });

  it('allows owners and admins, rejects others', () => {
    const resource = { author: 'u1' };
    expect(() => assertOwnerOrAdmin(resource, owner)).not.toThrow();
    expect(() => assertOwnerOrAdmin(resource, admin)).not.toThrow();
    expect(() => assertOwnerOrAdmin(resource, stranger)).toThrow(ApiError);
  });
});
