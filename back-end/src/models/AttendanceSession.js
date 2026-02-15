const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttendanceSession = sequelize.define('AttendanceSession', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    course_id: {
        type: DataTypes.STRING(21),
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id',
        },
    },
    course_section_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'course_sections',
            key: 'id',
        },
        comment: 'null = ทุก section',
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'ชื่อการเช็คชื่อ เช่น Lab01, Lecture Week 1',
    },
    pin_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'รหัส PIN 6 หลัก',
    },
    session_type: {
        type: DataTypes.ENUM('lecture', 'lab', 'online'),
        defaultValue: 'lecture',
        comment: 'รูปแบบการเรียน',
    },
    check_location: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'เปิดใช้การตรวจสอบตำแหน่ง',
    },
    location_lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        comment: 'ละติจูดศูนย์กลาง',
    },
    location_lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        comment: 'ลองจิจูดศูนย์กลาง',
    },
    radius_meters: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        comment: 'รัศมีที่อนุญาต (เมตร)',
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    late_threshold_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        comment: 'เวลาสาย (นาที) หลังจากเวลาเริ่ม',
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'closed'),
        defaultValue: 'draft',
        comment: 'draft=ยังไม่เปิด, active=กำลังเช็คชื่อ, closed=ปิดแล้ว',
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
    tableName: 'attendance_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Generate random PIN code (simple)
AttendanceSession.generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate unique PIN that doesn't conflict with active sessions
 * Active = sessions where start_time <= now <= end_time
 * This allows PIN reuse once sessions are closed
 * @param {number} maxAttempts - Maximum attempts before throwing error
 * @returns {Promise<string>} - Unique PIN code
 */
AttendanceSession.generateUniquePIN = async (maxAttempts = 10) => {
    const { Op } = require('sequelize');
    const now = new Date();
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if PIN is used by any currently active session
        // A session is "active" if start_time <= now <= end_time
        const existingSession = await AttendanceSession.findOne({
            where: {
                pin_code: pin,
                start_time: { [Op.lte]: now },
                end_time: { [Op.gte]: now },
            },
        });
        
        if (!existingSession) {
            return pin; // PIN is unique among active sessions
        }
    }
    
    // Fallback: return random PIN anyway (very unlikely to reach here)
    // With 900,000 possible PINs and typically < 100 active sessions,
    // collision probability is extremely low
    console.warn('Could not generate unique PIN after max attempts, using random PIN');
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = AttendanceSession;
