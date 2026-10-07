const mongoose = require('mongoose');
const { z } = require('zod');
const authorize = require('../../src/middleware/authorize');
const validate = require('../../src/middleware/validate');
const { normalizeError, errorHandler } = require('../../src/middleware/errorHandler');
const ApiError = require('../../src/utils/ApiError');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authorize middleware', () => {
  it('calls next() when the role is allowed', () => {
    const next = jest.fn();
    authorize('admin')({ user: { role: 'admin' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes a 403 when the role is not allowed', () => {
    const next = jest.fn();
    authorize('admin')({ user: { role: 'user' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('passes a 401 when there is no user', () => {
    const next = jest.fn();
    authorize('admin')({}, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });
});

describe('validate middleware', () => {
  const schemas = {
    body: z.object({ name: z.string().trim().min(2) }),
    query: z.object({ page: z.coerce.number().default(1) }),
  };

  it('replaces request data with parsed values', () => {
    const req = { body: { name: '  Bob ' }, query: { page: '3' } };
    const next = jest.fn();
    validate(schemas)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe('Bob');
    expect(req.query.page).toBe(3);
  });

  it('collects field errors from every source', () => {
    const req = { body: { name: 'B' }, query: { page: 'abc' } };
    const next = jest.fn();
    validate(schemas)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(err.details.map((d) => d.field)).toEqual(['body.name', 'query.page']);
  });
});

describe('error handler', () => {
  it('maps a mongoose CastError to 400', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'bad', '_id');
    expect(normalizeError(err)).toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });

  it('maps a duplicate key error to 409', () => {
    expect(normalizeError({ code: 11000, keyValue: { email: 'a@b.c' } })).toMatchObject({
      statusCode: 409,
      message: 'A record with this email already exists',
    });
  });

  it('maps a mongoose ValidationError to a 400 with details', () => {
    const err = new mongoose.Error.ValidationError();
    err.addError('title', new mongoose.Error.ValidatorError({ path: 'title', message: 'required' }));
    expect(normalizeError(err)).toMatchObject({
      statusCode: 400,
      details: [{ field: 'title', message: 'required' }],
    });
  });

  it('hides unknown errors behind a generic 500', () => {
    const res = mockRes();
    errorHandler(new Error('db password leaked'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
  });

  it('serialises ApiError with details', () => {
    const res = mockRes();
    errorHandler(ApiError.validation([{ field: 'x', message: 'bad' }]), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'x', message: 'bad' }] },
    });
  });
});
