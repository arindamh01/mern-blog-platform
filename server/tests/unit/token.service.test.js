const jwt = require('jsonwebtoken');
const tokenService = require('../../src/services/token.service');
const { RefreshToken } = require('../../src/models');
const { createUser } = require('../helpers');

describe('token service', () => {
  it('signs access tokens containing the user id and role', async () => {
    const user = await createUser();
    const payload = tokenService.verifyAccessToken(tokenService.signAccessToken(user));
    expect(payload).toMatchObject({ sub: String(user._id), role: 'user' });
  });

  it('rejects access tokens signed with another secret', () => {
    const forged = jwt.sign({ sub: 'x', role: 'admin' }, 'some-other-secret-that-is-long-enough');
    expect(() => tokenService.verifyAccessToken(forged)).toThrow();
  });

  it('stores only the hash of refresh tokens', async () => {
    const user = await createUser();
    const { token } = await tokenService.issueRefreshToken(user._id);
    const stored = await RefreshToken.findOne({ user: user._id }).lean();
    expect(stored.tokenHash).toBe(tokenService.hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
  });

  it('keeps the token family across rotations', async () => {
    const user = await createUser();
    const { token } = await tokenService.issueRefreshToken(user._id);
    const rotated = await tokenService.rotateRefreshToken(token);

    const docs = await RefreshToken.find({ user: user._id }).lean();
    expect(new Set(docs.map((d) => d.family)).size).toBe(1);
    expect(String(rotated.userId)).toBe(String(user._id));
  });

  it('rejects expired refresh tokens', async () => {
    const user = await createUser();
    const { token } = await tokenService.issueRefreshToken(user._id);
    await RefreshToken.updateOne({}, { expiresAt: new Date(Date.now() - 1000) });
    await expect(tokenService.rotateRefreshToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects tamped refresh tokens', async () => {
    await expect(tokenService.rotateRefreshToken('garbage')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
