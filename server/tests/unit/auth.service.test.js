const authService = require('../../src/services/auth.service');
const { User } = require('../../src/models');
const { createUser } = require('../helpers');

describe('auth service – OAuth', () => {
  const profile = {
    provider: 'google',
    providerId: 'g-123',
    email: 'Oauth@Test.dev',
    name: 'OAuth User',
    avatar: 'https://img/avatar.png',
  };

  it('creates a new user for a first-time OAuth login', async () => {
    const user = await authService.findOrCreateOAuthUser(profile);
    expect(user).toMatchObject({
      email: 'oauth@test.dev',
      provider: 'google',
      providerId: 'g-123',
      role: 'user',
    });
  });

  it('returns the same user on subsequent logins', async () => {
    const first = await authService.findOrCreateOAuthUser(profile);
    const second = await authService.findOrCreateOAuthUser(profile);
    expect(String(second._id)).toBe(String(first._id));
    expect(await User.countDocuments()).toBe(1);
  });

  it('links to an existing local account with the same email', async () => {
    const local = await createUser({ email: 'oauth@test.dev' });
    const user = await authService.findOrCreateOAuthUser(profile);
    expect(String(user._id)).toBe(String(local._id));
    expect(user.avatar).toBe(profile.avatar);
  });

  it('rejects profiles without an email', async () => {
    await expect(
      authService.findOrCreateOAuthUser({ ...profile, email: undefined }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('issues a session for an active OAuth user', async () => {
    const user = await authService.findOrCreateOAuthUser(profile);
    const session = await authService.oauthLogin(user);
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
  });

  it('refuses sessions for deactivated users', async () => {
    const user = await createUser({ isActive: false });
    await expect(authService.oauthLogin(user)).rejects.toMatchObject({ statusCode: 403 });
  });
});
