import axios from 'axios';
import { vi } from 'vitest';
import api, { getAccessToken, getErrorMessage, refreshSession, setAccessToken } from './client';

describe('refreshSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it('shares a single in-flight refresh request between concurrent callers', async () => {
    let resolve;
    const post = vi.spyOn(axios, 'post').mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const calls = [refreshSession(), refreshSession(), refreshSession()];
    resolve({ data: { data: { accessToken: 'new-token', user: { name: 'A' } } } });
    const results = await Promise.all(calls);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.accessToken === 'new-token')).toBe(true);
    expect(getAccessToken()).toBe('new-token');
  });

  it('clears the token when the refresh fails', async () => {
    setAccessToken('stale');
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));
    await expect(refreshSession()).rejects.toThrow('401');
    expect(getAccessToken()).toBeNull();
  });
});

describe('response interceptor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it('refreshes once and retries the original request after a 401', async () => {
    setAccessToken('expired');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'fresh', user: {} } },
    });

    const seen = [];
    const adapter = vi.fn(async (config) => {
      seen.push(config.headers.Authorization);
      if (config.headers.Authorization === 'Bearer expired') {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = { status: 401, data: {} };
        throw error;
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    });

    const res = await api.get('/posts', { adapter });
    expect(res.data).toEqual({ ok: true });
    expect(seen).toEqual(['Bearer expired', 'Bearer fresh']);
  });
});

describe('getErrorMessage', () => {
  it('prefers validation details, then the API message, then a fallback', () => {
    const details = { response: { data: { error: { details: [{ message: 'a' }, { message: 'b' }] } } } };
    expect(getErrorMessage(details)).toBe('a, b');
    expect(getErrorMessage({ response: { data: { error: { message: 'Nope' } } } })).toBe('Nope');
    expect(getErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
