const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const configurePassport = require('./config/passport');
const v1Router = require('./routes/v1');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp(options = {}) {
  const app = express();
  const passport = configurePassport();

  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(passport.initialize());
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use('/api', apiLimiter);
  app.use('/api/v1', v1Router(options));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
