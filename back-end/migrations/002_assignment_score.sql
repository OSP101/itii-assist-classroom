-- Migration: Create Assignment & Score tables
-- Date: 2026-01-01

-- ============================================
-- Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('individual', 'permanent_group', 'weekly_group') NOT NULL DEFAULT 'individual',
    week_number INT DEFAULT NULL COMMENT 'สำหรับงานกลุ่มประจำสัปดาห์',
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    has_sub_items BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATETIME DEFAULT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_assignments_course (course_id),
    INDEX idx_assignments_type (type),
    INDEX idx_assignments_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Assignment Sub Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_sub_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_sub_items_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Scores Table
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    sub_item_id INT DEFAULT NULL COMMENT 'null ถ้างานไม่มี sub-items',
    group_id INT DEFAULT NULL COMMENT 'สำหรับงานกลุ่ม',
    score DECIMAL(5,2) NOT NULL,
    comment TEXT,
    graded_by INT NOT NULL,
    graded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (sub_item_id) REFERENCES assignment_sub_items(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES student_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Unique constraint: one score per student per sub-item (or main if no sub-items)
    UNIQUE KEY unique_score_per_student_per_item (assignment_id, student_id, sub_item_id),
    
    INDEX idx_scores_assignment (assignment_id),
    INDEX idx_scores_student (student_id),
    INDEX idx_scores_grader (graded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Score Edit Requests Table
-- ============================================
CREATE TABLE IF NOT EXISTS score_edit_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    score_id INT NOT NULL,
    old_score DECIMAL(5,2) NOT NULL,
    new_score DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    requested_by INT NOT NULL,
    reviewed_by INT DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_edit_requests_score (score_id),
    INDEX idx_edit_requests_status (status),
    INDEX idx_edit_requests_requester (requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
