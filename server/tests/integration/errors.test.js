const { api } = require('../helpers');

describe('API conventions', () => {
  it('serves a versioned health endpoint with the success envelope', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ success: true, message: 'API is healthy' });
  });

  it('returns a consistent 404 for unknown routes', async () => {
    const res = await api().get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'Route GET /api/v1/does-not-exist not found' },
    });
  });

  it('returns a consistent 400 for malformed JSON', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
