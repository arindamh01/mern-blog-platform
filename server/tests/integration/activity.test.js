const { api, createUser, createAdmin, authHeader } = require('../helpers');

const waitForLogs = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Activity logging', () => {
  it('records user actions and exposes them to admins with filters', async () => {
    const [user, admin] = await Promise.all([createUser(), createAdmin()]);

    const created = await api()
      .post('/api/v1/posts')
      .set(authHeader(user))
      .send({ title: 'Logged post', content: 'Content that will be logged.' });
    await api().delete(`/api/v1/posts/${created.body.data._id}`).set(authHeader(user));
    await waitForLogs();

    const all = await api().get('/api/v1/admin/activity-logs').set(authHeader(admin)).expect(200);
    expect(all.body.data.map((l) => l.action)).toEqual(['POST_DELETE', 'POST_CREATE']);
    expect(all.body.data[0]).toMatchObject({
      targetType: 'Post',
      targetId: created.body.data._id,
      user: { name: user.name },
    });

    const filtered = await api()
      .get('/api/v1/admin/activity-logs?action=POST_CREATE')
      .set(authHeader(admin))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
  });

  it('does not log failed requests', async () => {
    const [owner, other, admin] = await Promise.all([createUser(), createUser(), createAdmin()]);
    const created = await api()
      .post('/api/v1/posts')
      .set(authHeader(owner))
      .send({ title: 'Protected post', content: 'Only the owner may delete.' });

    await api().delete(`/api/v1/posts/${created.body.data._id}`).set(authHeader(other)).expect(403);
    await waitForLogs();

    const res = await api()
      .get('/api/v1/admin/activity-logs?action=POST_DELETE')
      .set(authHeader(admin));
    expect(res.body.data).toHaveLength(0);
  });
});
