const { api, createUser, createAdmin, authHeader, createPost } = require('../helpers');
const { Post, ActivityLog } = require('../../src/models');

const waitForLogs = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Posts API', () => {
  let author;
  let other;
  let admin;

  beforeEach(async () => {
    [author, other, admin] = await Promise.all([createUser(), createUser(), createAdmin()]);
  });

  describe('POST /api/v1/posts', () => {
    it('creates a post with a URL-friendly slug and logs the activity', async () => {
      const res = await api()
        .post('/api/v1/posts')
        .set(authHeader(author))
        .send({ title: 'Hello World: MERN & You!', content: 'This is the body of the post.' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        title: 'Hello World: MERN & You!',
        slug: 'hello-world-mern-and-you',
        author: { _id: String(author._id), name: author.name },
      });
      expect(res.body.data.createdAt).toBeDefined();

      await waitForLogs();
      expect(await ActivityLog.countDocuments({ action: 'POST_CREATE', user: author._id })).toBe(1);
    });

    it('generates a unique slug when titles collide', async () => {
      const body = { title: 'Same Title', content: 'This is the body of the post.' };
      const first = await api().post('/api/v1/posts').set(authHeader(author)).send(body);
      const second = await api().post('/api/v1/posts').set(authHeader(author)).send(body);

      expect(first.body.data.slug).toBe('same-title');
      expect(second.body.data.slug).toMatch(/^same-title-[a-f0-9]{6}$/);
    });

    it('requires authentication', async () => {
      await api().post('/api/v1/posts').send({ title: 'x', content: 'y' }).expect(401);
    });

    it('validates the payload', async () => {
      const res = await api()
        .post('/api/v1/posts')
        .set(authHeader(author))
        .send({ title: 'Hi' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/posts', () => {
    it('returns paginated, non-deleted posts newest first with excerpts', async () => {
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await createPost(author, { createdAt: new Date(Date.now() + i * 1000) });
      }
      await createPost(author, { isDeleted: true, deletedAt: new Date() });

      const res = await api().get('/api/v1/posts?page=2&limit=5').expect(200);

      expect(res.body.meta).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
      expect(res.body.data).toHaveLength(5);
      expect(res.body.data[0]).toHaveProperty('excerpt');
      expect(res.body.data[0]).not.toHaveProperty('content');
      expect(res.body.data[0].author).toEqual({ _id: String(author._id), name: author.name });
    });

    it('supports full-text search', async () => {
      await createPost(author, { title: 'Learning MongoDB indexes' });
      await createPost(author, { title: 'React hooks deep dive' });

      const res = await api().get('/api/v1/posts?search=mongodb').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Learning MongoDB indexes');
    });

    it('caps the page size', async () => {
      await api().get('/api/v1/posts?limit=500').expect(400);
    });
  });

  describe('GET /api/v1/posts/:slug', () => {
    it('returns the full post with its comment count', async () => {
      const post = await createPost(author, { slug: 'my-post' });
      const res = await api().get('/api/v1/posts/my-post').expect(200);
      expect(res.body.data).toMatchObject({ _id: String(post._id), commentCount: 0 });
      expect(res.body.data.content).toBeDefined();
    });

    it('returns 404 for a soft-deleted post', async () => {
      await createPost(author, { slug: 'gone', isDeleted: true });
      await api().get('/api/v1/posts/gone').expect(404);
    });
  });

  describe('PATCH /api/v1/posts/:id', () => {
    it('lets the owner update and regenerates the slug when the title changes', async () => {
      const post = await createPost(author);
      const res = await api()
        .patch(`/api/v1/posts/${post._id}`)
        .set(authHeader(author))
        .send({ title: 'A Brand New Title' })
        .expect(200);
      expect(res.body.data).toMatchObject({ title: 'A Brand New Title', slug: 'a-brand-new-title' });
    });

    it("forbids editing another user's post", async () => {
      const post = await createPost(author);
      const res = await api()
        .patch(`/api/v1/posts/${post._id}`)
        .set(authHeader(other))
        .send({ content: 'Hijacked content here.' })
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows an admin to edit any post', async () => {
      const post = await createPost(author);
      await api()
        .patch(`/api/v1/posts/${post._id}`)
        .set(authHeader(admin))
        .send({ content: 'Moderated by an admin.' })
        .expect(200);
    });

    it('returns 400 for an invalid id', async () => {
      await api()
        .patch('/api/v1/posts/not-an-id')
        .set(authHeader(author))
        .send({ content: 'Valid content here.' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/posts/:id', () => {
    it('soft deletes the post', async () => {
      const post = await createPost(author);
      await api().delete(`/api/v1/posts/${post._id}`).set(authHeader(author)).expect(200);

      const stored = await Post.findById(post._id).lean();
      expect(stored).toMatchObject({ isDeleted: true, deletedBy: author._id });
      expect(stored.deletedAt).toBeInstanceOf(Date);

      const list = await api().get('/api/v1/posts');
      expect(list.body.data).toHaveLength(0);
    });

    it("forbids deleting another user's post", async () => {
      const post = await createPost(author);
      await api().delete(`/api/v1/posts/${post._id}`).set(authHeader(other)).expect(403);
      expect((await Post.findById(post._id)).isDeleted).toBe(false);
    });

    it('returns 404 when deleting an already deleted post', async () => {
      const post = await createPost(author, { isDeleted: true });
      await api().delete(`/api/v1/posts/${post._id}`).set(authHeader(author)).expect(404);
    });
  });

  describe('GET /api/v1/users/me/posts', () => {
    it("returns only the current user's posts", async () => {
      await createPost(author);
      await createPost(other);
      const res = await api().get('/api/v1/users/me/posts').set(authHeader(author)).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].author._id).toBe(String(author._id));
    });
  });
});
