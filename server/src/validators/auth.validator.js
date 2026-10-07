const { z } = require('./common');

const email = z.string().trim().toLowerCase().email('Invalid email address');

const register = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/\d/, 'Password must contain a number'),
  }),
};

const login = {
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
  }),
};

module.exports = { register, login };
