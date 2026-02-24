/**
 * User Controller - CRUD operations for user management
 */

const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { adminLinkByEmail } = require('./oauth.controller');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Generated password
 */
const generatePassword = (length = 12) => {
  const crypto = require('crypto');
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%';
  
  // Ensure at least one of each type using crypto
  const randomByte = () => crypto.randomBytes(1)[0];
  const randomFrom = (str) => str[randomByte() % str.length];
  
  let password = '';
  password += randomFrom(uppercase);
  password += randomFrom(lowercase);
  password += randomFrom(numbers);
  password += randomFrom(special);
  
  // Fill the rest
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += randomFrom(allChars);
  }
  
  // Shuffle the password using Fisher-Yates with crypto
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomByte() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

/**
 * Get all users with pagination, search, and filtering
 * @route GET /api/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    status = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  // Validate sortBy against allowlist to prevent injection
  const validSortColumns = ['created_at', 'updated_at', 'username', 'full_name', 'email', 'role', 'is_active', 'last_login_at'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'desc';

  // Cap limit to prevent dumping entire table
  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

  // Build where clause
  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { username: { [Op.like]: `%${search}%` } },
      { full_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  if (role && ['admin', 'instructor', 'ta'].includes(role)) {
    whereClause.role = role;
  }

  if (status === 'active') {
    whereClause.is_active = true;
  } else if (status === 'inactive') {
    whereClause.is_active = false;
  }

  // Get users with pagination
  const { count, rows: users } = await User.findAndCountAll({
    where: whereClause,
    attributes: { exclude: ['password_hash'] },
    order: [[safeSortBy, safeSortOrder.toUpperCase()]],
    limit: safeLimit,
    offset: offset,
  });

  res.json({
    success: true,
    data: {
      users: users.map(user => user.toSafeObject()),
      pagination: {
        total: count,
        page: Math.max(parseInt(page) || 1, 1),
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
      },
    },
  });
});

/**
 * Get single user by ID
 * @route GET /api/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });

  if (!user) {
    throw new ApiError(404, 'ไม่พบผู้ใช้งาน');
  }

  res.json({
    success: true,
    data: user.toSafeObject(),
  });
});

/**
 * Create new user
 * @route POST /api/users
 */
const createUser = asyncHandler(async (req, res) => {
  const { username, role, full_name, email, is_active = true, avatar } = req.body;

  // Validation
  if (!username || !role) {
    throw new ApiError(400, 'กรุณากรอกข้อมูลให้ครบถ้วน');
  }

  if (!['admin', 'instructor', 'ta'].includes(role)) {
    throw new ApiError(400, 'บทบาทไม่ถูกต้อง');
  }

  // Check if username already exists
  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    throw new ApiError(400, 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new ApiError(400, 'อีเมลนี้มีอยู่ในระบบแล้ว');
    }
  }

  // Generate random password
  const generatedPassword = generatePassword(12);

  // Create user with must_change_password = true
  const user = await User.create({
    username,
    password_hash: generatedPassword, // Will be hashed by beforeCreate hook
    role,
    full_name,
    email,
    is_active,
    provider: 'local',
    avatar,
    must_change_password: true, // Force password change on first login
  });

  // Auto-link Google account if email is provided
  if (email) {
    await adminLinkByEmail(user.id, email, 'google');
  }

  // Log action
  await SystemLog.create({
    user_id: req.user.id,
    action: 'CREATE_USER',
    entity_type: 'users',
    entity_id: user.id,
    description: `สร้างผู้ใช้ใหม่: ${username}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    message: 'สร้างผู้ใช้สำเร็จ',
    data: {
      user: user.toSafeObject(),
      credentials: {
        username: username,
        password: generatedPassword, // Return plain password for admin to share
      },
    },
  });
});

/**
 * Update user
 * @route PUT /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, password, role, full_name, email, is_active, avatar } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'ไม่พบผู้ใช้งาน');
  }

  // Check if username already exists (if changed)
  if (username && username !== user.username) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new ApiError(400, 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }
    user.username = username;
  }

  // Check if email already exists (if changed)
  if (email && email !== user.email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new ApiError(400, 'อีเมลนี้มีอยู่ในระบบแล้ว');
    }
    user.email = email;
  }

  // Update fields
  if (role && ['admin', 'instructor', 'ta'].includes(role)) {
    user.role = role;
  }
  if (full_name !== undefined) {
    user.full_name = full_name;
  }
  if (is_active !== undefined) {
    user.is_active = is_active;
  }
  if (password) {
    user.password_hash = password; // Will be hashed by beforeUpdate hook
  }
  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  await user.save();

  // Log action
  await SystemLog.create({
    user_id: req.user.id,
    action: 'UPDATE_USER',
    entity_type: 'users',
    entity_id: user.id,
    description: `แก้ไขข้อมูลผู้ใช้: ${user.username}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'อัปเดตผู้ใช้สำเร็จ',
    data: user.toSafeObject(),
  });
});

/**
 * Delete user
 * @route DELETE /api/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    throw new ApiError(400, 'ไม่สามารถลบบัญชีของตัวเองได้');
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'ไม่พบผู้ใช้งาน');
  }

  const username = user.username;
  await user.destroy();

  // Log action
  await SystemLog.create({
    user_id: req.user.id,
    action: 'DELETE_USER',
    entity_type: 'users',
    entity_id: id,
    description: `ลบผู้ใช้: ${username}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'ลบผู้ใช้สำเร็จ',
  });
});

/**
 * Toggle user status (active/inactive)
 * @route PATCH /api/users/:id/status
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent toggling yourself
  if (parseInt(id) === req.user.id) {
    throw new ApiError(400, 'ไม่สามารถเปลี่ยนสถานะบัญชีของตัวเองได้');
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'ไม่พบผู้ใช้งาน');
  }

  user.is_active = !user.is_active;
  await user.save();

  // Log action
  await SystemLog.create({
    user_id: req.user.id,
    action: user.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entity_type: 'users',
    entity_id: user.id,
    description: `${user.is_active ? 'เปิด' : 'ปิด'}ใช้งานผู้ใช้: ${user.username}`,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: user.is_active ? 'เปิดใช้งานผู้ใช้สำเร็จ' : 'ปิดใช้งานผู้ใช้สำเร็จ',
    data: user.toSafeObject(),
  });
});

/**
 * Get user statistics
 * @route GET /api/users/stats
 */
const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.count();
  const activeUsers = await User.count({ where: { is_active: true } });
  const adminCount = await User.count({ where: { role: 'admin' } });
  const instructorCount = await User.count({ where: { role: 'instructor' } });
  const taCount = await User.count({ where: { role: 'ta' } });

  res.json({
    success: true,
    data: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: {
        admin: adminCount,
        instructor: instructorCount,
        ta: taCount,
      },
    },
  });
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
};
