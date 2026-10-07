const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const env = require('./env');
const authService = require('../services/auth.service');
const { AUTH_PROVIDERS } = require('../utils/constants');
const logger = require('../utils/logger');

function verifyWith(provider) {
  return async (_accessToken, _refreshToken, profile, done) => {
    try {
      const user = await authService.findOrCreateOAuthUser({
        provider,
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  };
}

function configurePassport() {
  if (env.googleEnabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${env.SERVER_URL}/api/v1/auth/google/callback`,
        },
        verifyWith(AUTH_PROVIDERS.GOOGLE),
      ),
    );
  } else if (!env.isTest) {
    logger.warn('Google OAuth disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set');
  }

  if (env.facebookEnabled) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: env.FACEBOOK_APP_ID,
          clientSecret: env.FACEBOOK_APP_SECRET,
          callbackURL: `${env.SERVER_URL}/api/v1/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails', 'photos'],
        },
        verifyWith(AUTH_PROVIDERS.FACEBOOK),
      ),
    );
  } else if (!env.isTest) {
    logger.warn('Facebook OAuth disabled: FACEBOOK_APP_ID/FACEBOOK_APP_SECRET not set');
  }

  return passport;
}

module.exports = configurePassport;
