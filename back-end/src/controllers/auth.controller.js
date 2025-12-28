const passport = require('passport');
const { User, RefreshToken, SystemLog } = require('../models');
const { jwt: jwtUtil, ApiError, asyncHandler, logger } = require('../utils');
const { authLogger, securityLogger } = require('../middlewares/requestLogger');
const config = require('../config');

/**
 * Login with username and password
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      // Log failed login attempt
      await authLogger.logLoginFailed(req, req.body?.username || 'unknown', info?.message || 'Invalid credentials');
      return next(ApiError.unauthorized(info?.message || 'Invalid credentials'));
    }
    
    try {
      // Generate tokens
      const { accessToken, refreshToken, jti, expiresAt } = jwtUtil.generateTokens(user);
      
      // Save refresh token to database
      await RefreshToken.create({
        jti,
        user_id: user.id,
        expires_at: expiresAt,
        meta: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });
      
      // Log the login action
      await authLogger.logLogin(req, user, 'local');
      
      logger.info(`User ${user.username} logged in successfully`);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toSafeObject(),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  // Verify refresh token
  const decoded = jwtUtil.verifyRefreshToken(refreshToken);
  
  if (!decoded) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  
  // Check if token exists and is not revoked
  const tokenRecord = await RefreshToken.findOne({
    where: { jti: decoded.jti, revoked: false },
  });
  
  if (!tokenRecord) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }
  
  // Get user
  const user = await User.findByPk(decoded.userId);
  
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('User not found or inactive');
  }
  
  // Revoke old refresh token
  tokenRecord.revoked = true;
  await tokenRecord.save();
  
  // Generate new tokens
  const { 
    accessToken: newAccessToken, 
    refreshToken: newRefreshToken, 
    jti, 
    expiresAt 
  } = jwtUtil.generateTokens(user);
  
  // Save new refresh token
  await RefreshToken.create({
    jti,
    user_id: user.id,
    expires_at: expiresAt,
    meta: {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });
  
  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * Logout - revoke refresh token
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    const decoded = jwtUtil.verifyRefreshToken(refreshToken);
    
    if (decoded?.jti) {
      await RefreshToken.update(
        { revoked: true },
        { where: { jti: decoded.jti } }
      );
    }
  }
  
  // Log the logout action
  if (req.user) {
    await authLogger.logLogout(req, req.user);
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password_hash'] },
  });
  
  res.json({
    success: true,
    data: {
      user: user.toSafeObject(),
    },
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const user = await User.findByPk(req.user.id);
  
  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  
  // Update password
  user.password_hash = newPassword; // Will be hashed by beforeUpdate hook
  await user.save();
  
  // Revoke all refresh tokens for this user
  await RefreshToken.update(
    { revoked: true },
    { where: { user_id: user.id } }
  );
  
  // Log password change
  await authLogger.logPasswordChange(req, user);
  
  res.json({
    success: true,
    message: 'Password changed successfully. Please login again.',
  });
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, email } = req.body;
  
  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Update allowed fields
  if (full_name !== undefined) user.full_name = full_name;
  if (email !== undefined) user.email = email;
  
  await user.save();
  
  // Log profile update
  await SystemLog.create({
    log_type: 'system',
    severity: 'info',
    actor_user_id: user.id,
    action: 'profile_updated',
    detail: `User ${user.username} updated their profile`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toSafeObject(),
    },
  });
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
const googleCallback = asyncHandler(async (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      // Redirect to frontend with error
      const errorMessage = encodeURIComponent(info?.message || 'Google login failed');
      return res.redirect(`${config.frontendUrl}/login?error=${errorMessage}`);
    }
    
    try {
      // Generate tokens
      const { accessToken, refreshToken, jti, expiresAt } = jwtUtil.generateTokens(user);
      
      // Save refresh token to database
      await RefreshToken.create({
        jti,
        user_id: user.id,
        expires_at: expiresAt,
        meta: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          provider: 'google',
        },
      });
      
      // Log the login action
      await authLogger.logLogin(req, user, 'google');
      
      // Redirect to frontend with tokens
      const redirectUrl = `${config.frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
      
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
  googleCallback,
};
