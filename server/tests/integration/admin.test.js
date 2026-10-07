const { api, createUser, createAdmin, authHeader, createPost } = require('../helpers');
const { User, Post, Comment, RefreshToken } = require('../../src/models');
const { issueRefreshToken } = require('../../src/services/token.service');

describe('Admin API', () => {
  let admin;
  let user;

  beforeEach(async () => {
    [admin, user] = await Promise.all([createAdmin(), createUser()]);
  });

  describe('access control', () => {
    it.each([
      ['get', '/api/v1/admin/stats'],
      ['get', '/api/v1/admin/users'],
      ['get', '/api/v1/admin/posts'],
      ['get', '/api/v1/admin/comments'],
      ['get', '/api/v1/admin/activity-logs'],
    ])('%s %s returns 403 for a regular user and 401 when anonymous', async (method, url) => {
      await api()[method](url).expect(401);
      const res = await api()[method](url).set(authHeader(user)).expect(403);
      expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    });

    it('rejects a token belonging to a deactivated admin', async () => {
      await User.updateOne({ _id: admin._id }, { isActive: false });
      await api().get('/api/v1/admin/stats').set(authHeader(admin)).expect(403);
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('returns totals for users, posts and comments', async () => {
      const post = await createPost(user);
      await createPost(user, { isDeleted: true });
      await Comment.create({ content: 'hi', post: post._id, author: user._id });

      const res = await api().get('/api/v1/admin/stats').set(authHeader(admin)).expect(200);
      expect(res.body.data).toMatchObject({
        totalUsers: 2,
        totalAdmins: 1,
        totalPosts: 1,
        deletedPosts: 1,
        totalComments: 1,
      });
      expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
    });
  });

  describe('user management', () => {
    it('lists and searches users', async () => {
      const res = await api()
        .get(`/api/v1/admin/users?search=${encodeURIComponent(user.email)}`)
        .set(authHeader(admin))
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].password).toBeUndefined();
    });

    it("promotes a user and revokes the user's refresh tokens", async () => {
      await issueRefreshToken(user._id);
      const res = await api()
        .patch(`/api/v1/admin/users/${user._id}`)
        .set(authHeader(admin))
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.data.role).toBe('admin');
      expect(await RefreshToken.countDocuments({ user: user._id, revokedAt: null })).toBe(0);
    });

    it('prevents an admin from demoting themselves', async () => {
      await api()
        .patch(`/api/v1/admin/users/${admin._id}`)
        .set(authHeader(admin))
        .send({ role: 'user' })
        .expect(400);
    });

    it("deletes a user, removes their comments and soft deletes their posts", async () => {
      const post = await createPost(user);
      await Comment.create({ content: 'bye', post: post._id, author: user._id });

      await api().delete(`/api/v1/admin/users/${user._id}`).set(authHeader(admin)).expect(200);

      expect(await User.findById(user._id)).toBeNull();
      expect(await Comment.countDocuments({ author: user._id })).toBe(0);
      expect((await Post.findById(post._id)).isDeleted).toBe(true);
    });
  });

  describe('post management', () => {
    it('lists deleted posts and restores them', async () => {
      const post = await createPost(user, { isDeleted: true, deletedAt: new Date() });

      const list = await api()
        .get('/api/v1/admin/posts?onlyDeleted=true')
        .set(authHeader(admin))
        .expect(200);
      expect(list.body.data).toHaveLength(1);

      await api()
        .patch(`/api/v1/admin/posts/${post._id}/restore`)
        .set(authHeader(admin))
        .expect(200);
      expect((await Post.findById(post._id)).isDeleted).toBe(false);
    });

    it('permanently deletes a post and its comments', async () => {
      const post = await createPost(user);
      await Comment.create({ content: 'x', post: post._id, author: user._id });

      await api()
        .delete(`/api/v1/admin/posts/${post._id}/permanent`)
        .set(authHeader(admin))
        .expect(200);

      expect(await Post.findById(post._id)).toBeNull();
      expect(await Comment.countDocuments({ post: post._id })).toBe(0);
    });
  });

  describe('comment management', () => {
    it('lists all comments with their post', async () => {
      const post = await createPost(user);
      await Comment.create({ content: 'x', post: post._id, author: user._id });

      const res = await api().get('/api/v1/admin/comments').set(authHeader(admin)).expect(200);
      expect(res.body.data[0].post).toMatchObject({ title: post.title, slug: post.slug });
    });
  });
});
