const { api, createUser, createAdmin, authHeader, createPost } = require('../helpers');
const { Comment } = require('../../src/models');

describe('Comments API', () => {
  let author;
  let commenter;
  let admin;
  let post;

  beforeEach(async () => {
    [author, commenter, admin] = await Promise.all([createUser(), createUser(), createAdmin()]);
    post = await createPost(author);
  });

  const addComment = (user, content = 'Great post!') =>
    Comment.create({ content, post: post._id, author: user._id });

  it('creates a comment referencing the post and author', async () => {
    const res = await api()
      .post(`/api/v1/posts/${post._id}/comments`)
      .set(authHeader(commenter))
      .send({ content: 'Nice read' })
      .expect(201);

    expect(res.body.data).toMatchObject({
      content: 'Nice read',
      post: String(post._id),
      author: { _id: String(commenter._id), name: commenter.name },
    });
  });

  it('lists comments for a post with pagination', async () => {
    await Promise.all([addComment(commenter, 'one'), addComment(author, 'two'), addComment(admin)]);
    const res = await api().get(`/api/v1/posts/${post._id}/comments?limit=2`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
  });

  it('rejects comments on a soft-deleted post', async () => {
    const deleted = await createPost(author, { isDeleted: true });
    await api()
      .post(`/api/v1/posts/${deleted._id}/comments`)
      .set(authHeader(commenter))
      .send({ content: 'Hello?' })
      .expect(404);
  });

  it('requires authentication to comment', async () => {
    await api().post(`/api/v1/posts/${post._id}/comments`).send({ content: 'hi' }).expect(401);
  });

  it('lets the owner edit their comment', async () => {
    const comment = await addComment(commenter);
    const res = await api()
      .patch(`/api/v1/comments/${comment._id}`)
      .set(authHeader(commenter))
      .send({ content: 'Edited' })
      .expect(200);
    expect(res.body.data.content).toBe('Edited');
  });

  it("forbids editing or deleting someone else's comment", async () => {
    const comment = await addComment(commenter);
    await api()
      .patch(`/api/v1/comments/${comment._id}`)
      .set(authHeader(author))
      .send({ content: 'Edited' })
      .expect(403);
    await api().delete(`/api/v1/comments/${comment._id}`).set(authHeader(author)).expect(403);
  });

  it('allows an admin to delete any comment', async () => {
    const comment = await addComment(commenter);
    await api().delete(`/api/v1/comments/${comment._id}`).set(authHeader(admin)).expect(200);
    expect(await Comment.findById(comment._id)).toBeNull();
  });

  it('returns 404 for a missing comment', async () => {
    await api()
      .delete('/api/v1/comments/507f1f77bcf86cd799439011')
      .set(authHeader(commenter))
      .expect(404);
  });
});
