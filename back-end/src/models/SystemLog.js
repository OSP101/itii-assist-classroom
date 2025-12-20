const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemLog = sequelize.define('SystemLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  actor_user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  detail: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
}, {
  tableName: 'system_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

// Static method to create log entry
SystemLog.log = async function(action, detail = null, actorUserId = null, ipAddress = null) {
  return this.create({
    action,
    detail,
    actor_user_id: actorUserId,
    ip_address: ipAddress,
  });
};

module.exports = SystemLog;
