const http = require('http');
const { io: Client } = require('socket.io-client');
const { app, api, createUser, createAdmin, authHeader, createPost } = require('../helpers');
const { initSocket } = require('../../src/sockets');
const { signAccessToken } = require('../../src/services/token.service');

describe('Socket.io notifications', () => {
  let server;
  let io;
  let url;
  const clients = [];

  beforeAll(async () => {
    server = http.createServer(app);
    io = initSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(() => {
    while (clients.length) clients.pop().disconnect();
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const connect = (token) =>
    new Promise((resolve, reject) => {
      const socket = Client(url, { auth: { token }, transports: ['websocket'], reconnection: false });
      clients.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });

  const nextNotification = (socket) =>
    new Promise((resolve) => socket.once('notification', resolve));

  it('rejects connections without a valid token', async () => {
    await expect(connect('invalid')).rejects.toThrow('Unauthorized');
  });

  it('notifies a post author in real time when someone comments', async () => {
    const [author, commenter] = await Promise.all([createUser(), createUser()]);
    const post = await createPost(author, { title: 'Realtime post' });
    const socket = await connect(signAccessToken(author));

    const received = nextNotification(socket);
    await api()
      .post(`/api/v1/posts/${post._id}/comments`)
      .set(authHeader(commenter))
      .send({ content: 'Hello in real time' })
      .expect(201);

    await expect(received).resolves.toMatchObject({
      type: 'COMMENT_CREATED',
      postSlug: post.slug,
      message: `${commenter.name} commented on "Realtime post"`,
    });
  });

  it('notifies admins when a post is published', async () => {
    const [admin, author] = await Promise.all([createAdmin(), createUser()]);
    const socket = await connect(signAccessToken(admin));

    const received = nextNotification(socket);
    await api()
      .post('/api/v1/posts')
      .set(authHeader(author))
      .send({ title: 'Fresh post', content: 'Admins should hear about this.' })
      .expect(201);

    await expect(received).resolves.toMatchObject({ type: 'POST_CREATED' });
  });
});
