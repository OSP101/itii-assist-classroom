const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Assignment = sequelize.define('Assignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    course_id: {
        type: DataTypes.STRING(21), // nanoid format
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id',
        },
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    assignment_type: {
        type: DataTypes.ENUM('individual', 'permanent_group', 'weekly_group'),
        allowNull: false,
        defaultValue: 'individual',
        field: 'assignment_type',
    },
    week_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'สำหรับงานกลุ่มประจำสัปดาห์',
    },
    max_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 10,
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    order_index: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
    },
    created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Assignment;
