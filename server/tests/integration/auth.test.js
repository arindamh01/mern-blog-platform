const request = require('supertest');
const createApp = require('../../src/app');
const { api, createUser, authHeader } = require('../helpers');
const { User, RefreshToken, ActivityLog } = require('../../src/models');

const getRefreshCookie = (res) =>
  (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));

const cookieValue = (cookie) => cookie.split(';')[0];

const waitForLogs = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Auth API', () => {
  const credentials = { name: 'Jane Doe', email: 'jane@test.dev', password: 'Password123' };

  describe('POST /api/v1/auth/register', () => {
    it('creates a user, returns an access token and sets an httpOnly refresh cookie', async () => {
      const res = await api().post('/api/v1/auth/register').send(credentials).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({ email: 'jane@test.dev', role: 'user' });
      expect(res.body.data.user.password).toBeUndefined();

      const cookie = getRefreshCookie(res);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    });

    it('hashes the password with bcrypt', async () => {
      await api().post('/api/v1/auth/register').send(credentials).expect(201);
      const user = await User.findOne({ email: credentials.email }).select('+password');
      expect(user.password).not.toBe(credentials.password);
      expect(user.password).toMatch(/^\$2[aby]\$12\$/);
    });

    it('rejects duplicate emails with 409', async () => {
      await createUser({ email: credentials.email });
      const res = await api().post('/api/v1/auth/register').send(credentials).expect(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns validation details for an invalid payload', async () => {
      const res = await api()
        .post('/api/v1/auth/register')
        .send({ name: 'J', email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
      const fields = res.body.error.details.map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['body.name', 'body.email', 'body.password']));
    });

    it('ignores a role supplied by the client', async () => {
      const res = await api()
        .post('/api/v1/auth/register')
        .send({ ...credentials, role: 'admin' })
        .expect(201);
      expect(res.body.data.user.role).toBe('user');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(() => createUser({ email: credentials.email, password: credentials.password }));

    it('logs in with valid credentials and records a LOGIN activity', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(getRefreshCookie(res)).toBeDefined();

      await waitForLogs();
      expect(await ActivityLog.countDocuments({ action: 'LOGIN' })).toBe(1);
    });

    it('rejects a wrong password with a generic 401', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: 'WrongPass1' })
        .expect(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects deactivated accounts', async () => {
      await User.updateOne({ email: credentials.email }, { isActive: false });
      await api()
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(403);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const registerRes = await api().post('/api/v1/auth/register').send(credentials);
      const firstCookie = cookieValue(getRefreshCookie(registerRes));

      const res = await api().post('/api/v1/auth/refresh').set('Cookie', firstCookie).expect(200);
      const secondCookie = cookieValue(getRefreshCookie(res));

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(secondCookie).not.toBe(firstCookie);
      expect(await RefreshToken.countDocuments({ revokedAt: { $exists: true } })).toBe(1);
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const registerRes = await api().post('/api/v1/auth/register').send(credentials);
      const firstCookie = cookieValue(getRefreshCookie(registerRes));

      const rotated = await api().post('/api/v1/auth/refresh').set('Cookie', firstCookie);
      const secondCookie = cookieValue(getRefreshCookie(rotated));

      const reuse = await api().post('/api/v1/auth/refresh').set('Cookie', firstCookie).expect(401);
      expect(reuse.body.error.message).toMatch(/reuse detected/i);

      await api().post('/api/v1/auth/refresh').set('Cookie', secondCookie).expect(401);
    });

    it('returns 401 without a refresh cookie', async () => {
      await api().post('/api/v1/auth/refresh').expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token so it can no longer be used', async () => {
      const registerRes = await api().post('/api/v1/auth/register').send(credentials);
      const cookie = cookieValue(getRefreshCookie(registerRes));

      await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(200);
      await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the current user for a valid token', async () => {
      const user = await createUser();
      const res = await api().get('/api/v1/auth/me').set(authHeader(user)).expect(200);
      expect(res.body.data.user.email).toBe(user.email);
    });

    it('returns 401 for a missing or malformed token', async () => {
      await api().get('/api/v1/auth/me').expect(401);
      const res = await api()
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('OAuth', () => {
    it.each(['google', 'facebook'])(
      'redirects back to the login page when %s is not configured',
      async (provider) => {
        const res = await api().get(`/api/v1/auth/${provider}`).expect(302);
        expect(res.headers.location).toMatch(/\/login\?error=.+not%20configured$/);
      },
    );

    it('redirects to the client with an error when the provider callback fails', async () => {
      const res = await api().get('/api/v1/auth/google/callback').expect(302);
      expect(res.headers.location).toMatch(/\/login\?error=/);
    });
  });

  describe('rate limiting', () => {
    it('blocks excessive login attempts with 429', async () => {
      const limitedApp = createApp({ auth: { rateLimit: { max: 3, windowMs: 60_000 } } });
      const attempt = () =>
        request(limitedApp)
          .post('/api/v1/auth/login')
          .send({ email: 'nobody@test.dev', password: 'Password123' });

      await attempt().expect(401);
      await attempt().expect(401);
      await attempt().expect(401);
      const blocked = await attempt().expect(429);
      expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    });

    it('does not count successful logins against the limit', async () => {
      await createUser({ email: 'ok@test.dev', password: 'Password123' });
      const limitedApp = createApp({ auth: { rateLimit: { max: 2, windowMs: 60_000 } } });
      const login = () =>
        request(limitedApp)
          .post('/api/v1/auth/login')
          .send({ email: 'ok@test.dev', password: 'Password123' });

      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await login().expect(200);
      }
    });

    it('gives token refresh its own, larger budget than login', async () => {
      const limitedApp = createApp({ auth: { rateLimit: { max: 1, windowMs: 60_000 } } });
      const refresh = () => request(limitedApp).post('/api/v1/auth/refresh');

      for (let i = 0; i < 10; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await refresh().expect(401);
      }
      await refresh().expect(429);
    });
  });
});
