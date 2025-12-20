const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./index');
const { User } = require('../models');

/**
 * JWT Strategy - for protected routes
 */
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.accessSecret,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await User.findByPk(payload.userId);
      
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      
      if (!user.is_active) {
        return done(null, false, { message: 'Account deactivated' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

/**
 * Local Strategy - for username/password login
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ where: { username } });
        
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        if (!user.is_active) {
          return done(null, false, { message: 'Account has been deactivated' });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

/**
 * Google OAuth Strategy
 */
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Try to find user by Google ID
          let user = await User.findOne({ where: { google_id: profile.id } });
          
          if (user) {
            if (!user.is_active) {
              return done(null, false, { message: 'Account has been deactivated' });
            }
            return done(null, user);
          }
          
          // Try to find user by email and link Google account
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ where: { email } });
            
            if (user) {
              // Link Google account to existing user
              user.google_id = profile.id;
              user.provider = 'google';
              await user.save();
              
              if (!user.is_active) {
                return done(null, false, { message: 'Account has been deactivated' });
              }
              
              return done(null, user);
            }
          }
          
          // No existing user found - don't auto-create
          // Only Admin can create accounts
          return done(null, false, { 
            message: 'No account found with this Google account. Please contact administrator.' 
          });
          
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

module.exports = passport;
