const { sequelize } = require('../config/database');
const User = require('./User');
const Student = require('./Student');
const RefreshToken = require('./RefreshToken');
const SystemLog = require('./SystemLog');

// ============================================
// Define Associations
// ============================================

// User -> Student (linked_student_id)
User.belongsTo(Student, {
  foreignKey: 'linked_student_id',
  as: 'linkedStudent',
});

Student.hasOne(User, {
  foreignKey: 'linked_student_id',
  as: 'userAccount',
});

// User -> RefreshToken
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User -> SystemLog
User.hasMany(SystemLog, {
  foreignKey: 'actor_user_id',
  as: 'logs',
});

SystemLog.belongsTo(User, {
  foreignKey: 'actor_user_id',
  as: 'actor',
});

// ============================================
// Export all models
// ============================================
module.exports = {
  sequelize,
  User,
  Student,
  RefreshToken,
  SystemLog,
};
