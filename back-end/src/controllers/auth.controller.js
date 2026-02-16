const passport = require('passport');
const { User, RefreshToken, SystemLog } = require('../models');
const { jwt: jwtUtil, ApiError, asyncHandler, logger } = require('../utils');
const { authLogger, securityLogger } = require('../middlewares/requestLogger');
const UAParser = require('ua-parser-js');
const { Op } = require('sequelize');
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
          mustChangePassword: user.must_change_password || false,
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
    throw ApiError.badRequest('รหัสผ่านปัจจุบันของคุณไม่ถูกต้อง');
  }
  
  // Update password and reset must_change_password flag
  user.password_hash = newPassword; // Will be hashed by beforeUpdate hook
  user.must_change_password = false;
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
 * Force change password (for first login)
 * POST /api/auth/force-change-password
 */
const forceChangePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 6) {
    throw ApiError.badRequest('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  }
  
  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Only allow if must_change_password is true
  if (!user.must_change_password) {
    throw ApiError.badRequest('ไม่จำเป็นต้องเปลี่ยนรหัสผ่าน');
  }
  
  // Update password and reset flag
  user.password_hash = newPassword; // Will be hashed by beforeUpdate hook
  user.must_change_password = false;
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
    message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่',
  });
});

/**
 * Update user profile (requires password confirmation)
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, email, current_password } = req.body;
  
  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Verify current password before allowing profile update
  const isPasswordValid = await user.comparePassword(current_password);
  if (!isPasswordValid) {
    throw ApiError.badRequest('รหัสผ่านไม่ถูกต้อง');
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

/**
 * Get active sessions for current user
 * GET /api/auth/sessions
 */
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await RefreshToken.findAll({
    where: {
      user_id: req.user.id,
      revoked: false,
      expires_at: {
        [Op.gt]: new Date(),
      },
    },
    order: [['created_at', 'DESC']],
  });
  
  // Get current session JTI from access token
  const authHeader = req.get('Authorization');
  let currentJti = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwtUtil.verifyAccessToken(token);
      currentJti = decoded?.jti;
    } catch (e) {
      // Ignore
    }
  }
  
  // Parse user agent and format sessions
  const formattedSessions = sessions.map(session => {
    const meta = session.meta || {};
    const parser = new UAParser(meta.userAgent || '');
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    // Determine if this is the current session
    const isCurrent = session.jti === currentJti;
    
    return {
      id: session.id,
      jti: session.jti,
      ip: meta.ip || 'Unknown',
      browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : 'Unknown',
      os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown',
      device: device.type || 'Desktop',
      provider: meta.provider || 'local',
      loginAt: session.created_at,
      expiresAt: session.expires_at,
      isCurrent,
    };
  });
  
  res.json({
    success: true,
    data: {
      sessions: formattedSessions,
    },
  });
});

/**
 * Revoke a specific session
 * DELETE /api/auth/sessions/:sessionId
 */
const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const session = await RefreshToken.findOne({
    where: {
      id: sessionId,
      user_id: req.user.id,
      revoked: false,
    },
  });
  
  if (!session) {
    throw ApiError.notFound('Session not found');
  }
  
  session.revoked = true;
  await session.save();
  
  // Log session revocation
  await SystemLog.create({
    log_type: 'security',
    severity: 'info',
    actor_user_id: req.user.id,
    action: 'session_revoked',
    detail: `User ${req.user.username} revoked session ${sessionId}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });
  
  res.json({
    success: true,
    message: 'Session revoked successfully',
  });
});

/**
 * Revoke all sessions except current
 * POST /api/auth/sessions/revoke-all
 */
const revokeAllSessions = asyncHandler(async (req, res) => {
  // Get current session JTI
  const authHeader = req.get('Authorization');
  let currentJti = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwtUtil.verifyAccessToken(token);
      currentJti = decoded?.jti;
    } catch (e) {
      // Ignore
    }
  }
  
  // Revoke all sessions except current
  const whereClause = {
    user_id: req.user.id,
    revoked: false,
  };
  
  if (currentJti) {
    whereClause.jti = { [Op.ne]: currentJti };
  }
  
  const result = await RefreshToken.update(
    { revoked: true },
    { where: whereClause }
  );
  
  // Log
  await SystemLog.create({
    log_type: 'security',
    severity: 'warning',
    actor_user_id: req.user.id,
    action: 'all_sessions_revoked',
    detail: `User ${req.user.username} revoked all other sessions (${result[0]} sessions)`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });
  
  res.json({
    success: true,
    message: `Revoked ${result[0]} session(s)`,
    data: {
      revokedCount: result[0],
    },
  });
});

/**
 * Upload user avatar
 * POST /api/auth/avatar
 */
const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }
  
  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  // Process image with sharp and convert to base64
  const sharp = require('sharp');
  const processedBuffer = await sharp(req.file.buffer)
    .resize(256, 256, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({
      quality: 85,
      mozjpeg: true,
    })
    .toBuffer();
  
  // Convert to base64 data URL
  const base64Avatar = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
  
  // Update user avatar with base64
  user.avatar = base64Avatar;
  await user.save();
  
  // Log avatar update
  await SystemLog.create({
    log_type: 'system',
    severity: 'info',
    actor_user_id: user.id,
    action: 'avatar_updated',
    detail: `User ${user.username} updated their avatar`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });
  
  res.json({
    success: true,
    message: 'Avatar updated successfully',
    data: {
      avatar: base64Avatar,
    },
  });
});

/**
 * Remove user avatar
 * DELETE /api/auth/avatar
 */
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  user.avatar = null;
  await user.save();
  
  res.json({
    success: true,
    message: 'Avatar removed successfully',
    data: {
      user: user.toSafeObject(),
    },
  });
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forceChangePassword,
  googleCallback,
  getSessions,
  revokeSession,
  revokeAllSessions,
  uploadUserAvatar,
  removeAvatar,
};
