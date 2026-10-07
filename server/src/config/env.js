const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const isTest = process.env.NODE_ENV === 'test';

const testDefaults = isTest
  ? {
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!',
      MONGO_URI: 'mongodb://127.0.0.1:27017/mern-blog-test',
    }
  : {};

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5050),
  MONGO_URI: z.string().min(1),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SERVER_URL: z.string().url().default('http://localhost:5050'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
});

const parsed = schema.safeParse({ ...testDefaults, ...process.env });

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  facebookEnabled: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
};
