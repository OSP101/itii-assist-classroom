-- ============================================
-- Queue System Migration
-- ระบบจองคิวตรวจงาน
-- ============================================

-- 1. Queue Sessions - การเปิดรับจองคิว
CREATE TABLE IF NOT EXISTS queue_sessions (
    id VARCHAR(21) PRIMARY KEY,
    course_id VARCHAR(21) NOT NULL,
    classroom_id VARCHAR(21) NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT 'ชื่อการจองคิว เช่น Lab01 - ตรวจงาน',
    description TEXT COMMENT 'รายละเอียดเพิ่มเติม',
    
    -- PIN Code
    pin_code VARCHAR(10) NOT NULL COMMENT 'รหัส PIN 6 หลัก',
    
    -- การลิงก์กับ Assignment (สำหรับลงคะแนน)
    linked_assignment_id INT NULL COMMENT 'Assignment ที่ลิงก์สำหรับลงคะแนน',
    
    -- การเช็คชื่อก่อนจอง
    require_attendance BOOLEAN DEFAULT FALSE COMMENT 'ต้องเช็คชื่อก่อนจึงจะจองได้',
    linked_attendance_session_id BIGINT NULL COMMENT 'Session เช็คชื่อที่ลิงก์',
    
    -- สถานะ
    status ENUM('draft', 'active', 'paused', 'closed') DEFAULT 'draft' COMMENT 'draft=ยังไม่เปิด, active=กำลังรับจอง, paused=หยุดชั่วคราว, closed=ปิดแล้ว',
    
    -- เวลา
    start_time DATETIME NULL COMMENT 'เวลาเริ่มรับจอง',
    end_time DATETIME NULL COMMENT 'เวลาสิ้นสุดรับจอง',
    
    -- ผู้สร้าง
    created_by BIGINT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
    FOREIGN KEY (linked_attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_course_id (course_id),
    INDEX idx_classroom_id (classroom_id),
    INDEX idx_status (status),
    INDEX idx_pin_code (pin_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Queue Workers - ผู้รับงาน (อาจารย์/TA)
CREATE TABLE IF NOT EXISTS queue_workers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_session_id VARCHAR(21) NOT NULL,
    user_id BIGINT NOT NULL COMMENT 'อาจารย์หรือ TA',
    
    -- ประเภทงานที่รับ
    accept_grading BOOLEAN DEFAULT TRUE COMMENT 'รับตรวจงาน',
    accept_help BOOLEAN DEFAULT TRUE COMMENT 'รับแก้ไขปัญหา',
    
    -- สถานะ
    status ENUM('online', 'busy', 'offline') DEFAULT 'offline' COMMENT 'online=พร้อมรับงาน, busy=กำลังทำงาน, offline=ออฟไลน์',
    current_booking_id BIGINT NULL COMMENT 'งานที่กำลังทำอยู่',
    
    -- สถิติ
    total_grading_completed INT DEFAULT 0 COMMENT 'จำนวนตรวจงานเสร็จ',
    total_help_completed INT DEFAULT 0 COMMENT 'จำนวนช่วยเหลือเสร็จ',
    
    last_active_at TIMESTAMP NULL COMMENT 'เวลาที่ active ล่าสุด',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (queue_session_id) REFERENCES queue_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_worker (queue_session_id, user_id),
    INDEX idx_queue_session (queue_session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Queue Bookings - การจองคิว
CREATE TABLE IF NOT EXISTS queue_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_session_id VARCHAR(21) NOT NULL,
    
    -- นักศึกษาที่จอง
    student_id BIGINT NOT NULL COMMENT 'FK ไปยัง students table',
    
    -- โต๊ะที่จอง
    desk_id VARCHAR(21) NOT NULL,
    desk_number INT NOT NULL COMMENT 'เลขโต๊ะ (denormalized)',
    
    -- ประเภทการจอง
    booking_type ENUM('grading', 'help') NOT NULL COMMENT 'grading=ตรวจงาน, help=ขอความช่วยเหลือ',
    
    -- หมายเลขคิว
    queue_number INT NOT NULL COMMENT 'หมายเลขคิวในรอบนี้',
    
    -- หมายเหตุจากนักศึกษา
    note TEXT COMMENT 'หมายเหตุเพิ่มเติม เช่น ปัญหาที่พบ',
    
    -- สถานะการจอง
    status ENUM('waiting', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'waiting'
        COMMENT 'waiting=รอคิว, in_progress=กำลังตรวจ, completed=เสร็จ, cancelled=ยกเลิก, no_show=ไม่มา',
    
    -- ผู้รับงาน
    assigned_worker_id BIGINT NULL COMMENT 'ผู้ที่ได้รับมอบหมายตรวจ',
    assigned_at TIMESTAMP NULL COMMENT 'เวลาที่ได้รับมอบหมาย',
    
    -- เวลาดำเนินการ
    started_at TIMESTAMP NULL COMMENT 'เวลาเริ่มตรวจ',
    completed_at TIMESTAMP NULL COMMENT 'เวลาตรวจเสร็จ',
    
    -- คะแนน (ถ้ามี assignment ลิงก์)
    score DECIMAL(5,2) NULL COMMENT 'คะแนนที่ได้',
    score_comment TEXT COMMENT 'ความเห็นเรื่องคะแนน',
    
    -- Feedback จาก Worker
    worker_note TEXT COMMENT 'บันทึกจากผู้ตรวจ',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (queue_session_id) REFERENCES queue_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_worker_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_queue_session (queue_session_id),
    INDEX idx_student_id (student_id),
    INDEX idx_desk_id (desk_id),
    INDEX idx_status (status),
    INDEX idx_booking_type (booking_type),
    INDEX idx_queue_number (queue_session_id, queue_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Queue Desk Status - สถานะโต๊ะ (denormalized for performance)
CREATE TABLE IF NOT EXISTS queue_desk_status (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_session_id VARCHAR(21) NOT NULL,
    desk_id VARCHAR(21) NOT NULL,
    
    -- สถานะการตรวจ
    grading_status ENUM('not_started', 'waiting', 'in_progress', 'completed') DEFAULT 'not_started'
        COMMENT 'not_started=ยังไม่จอง, waiting=รอตรวจ, in_progress=กำลังตรวจ, completed=ตรวจแล้ว',
    grading_booking_id BIGINT NULL COMMENT 'Booking ID ปัจจุบันของ grading',
    
    -- สถานะการขอช่วยเหลือ
    help_status ENUM('none', 'waiting', 'in_progress') DEFAULT 'none'
        COMMENT 'none=ไม่มี, waiting=รอช่วยเหลือ, in_progress=กำลังช่วย',
    help_booking_id BIGINT NULL COMMENT 'Booking ID ปัจจุบันของ help',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (queue_session_id) REFERENCES queue_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_desk_session (queue_session_id, desk_id),
    INDEX idx_queue_session (queue_session_id),
    INDEX idx_grading_status (grading_status),
    INDEX idx_help_status (help_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Views for Dashboard
-- ============================================

-- View: คิวที่รอดำเนินการ
CREATE OR REPLACE VIEW v_pending_queue AS
SELECT 
    qb.*,
    s.student_id AS student_code,
    s.full_name AS student_name,
    qs.title AS session_title,
    qs.classroom_id,
    c.name AS classroom_name
FROM queue_bookings qb
JOIN students s ON qb.student_id = s.id
JOIN queue_sessions qs ON qb.queue_session_id = qs.id
JOIN classrooms c ON qs.classroom_id = c.id
WHERE qb.status IN ('waiting', 'in_progress')
ORDER BY qb.queue_number ASC;
