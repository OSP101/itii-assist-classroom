/**
 * Attendance Controller
 * จัดการระบบเช็คชื่อ
 */

const { Op } = require('sequelize');
const {
  AttendanceSession,
  AttendanceSessionSection,
  AttendanceRecord,
  Student,
  Course,
  CourseSection,
  CourseSectionStudent,
  User,
  sequelize,
} = require('../models');
const { emitToAttendance, emitToInstructor } = require('../config/socket');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Generate random 6-digit PIN
 */
const generatePIN = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Compute session status based on current time (without writing to DB)
 * @param {Object} session - AttendanceSession instance or plain object
 * @returns {string} Computed status: 'draft', 'active', or 'closed'
 */
const computeSessionStatus = (session) => {
  if (!session) return 'draft';
  
  const now = new Date();
  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);
  
  // ยังไม่ถึงเวลาเริ่ม
  if (now < startTime) {
    return 'draft';
  }
  // อยู่ในช่วงเวลา
  if (now >= startTime && now <= endTime) {
    return 'active';
  }
  // หมดเวลาแล้ว
  return 'closed';
};

/**
 * Add computed status to session object
 * @param {Object} session - AttendanceSession instance
 * @returns {Object} Session with computed status
 */
const addComputedStatus = (session) => {
  if (!session) return session;
  const sessionObj = session.toJSON ? session.toJSON() : session;
  return {
    ...sessionObj,
    status: computeSessionStatus(sessionObj),
  };
};

/**
 * Add computed status to multiple sessions
 * @param {Array} sessions - Array of AttendanceSession instances
 * @returns {Array} Sessions with computed status
 */
const addComputedStatusToMany = (sessions) => {
  return sessions.map(addComputedStatus);
};

// ============================================
// Instructor/TA Endpoints
// ============================================

/**
 * Get all attendance sessions for a course
 * GET /api/attendance?course_id=xxx
 */
const getAttendanceSessions = asyncHandler(async (req, res) => {
  const { course_id, status } = req.query;

  if (!course_id) {
    throw new ApiError(400, 'course_id is required');
  }

  const whereClause = { course_id };
  if (status) {
    whereClause.status = status;
  }

  const sessions = await AttendanceSession.findAll({
    where: whereClause,
    include: [
      {
        model: CourseSection,
        as: 'section', // Legacy single section
        attributes: ['id', 'section_no'],
      },
      {
        model: CourseSection,
        as: 'sections', // New: multiple sections via junction table
        attributes: ['id', 'section_no'],
        through: { attributes: [] },
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'full_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  // ✅ OPTIMIZED: Get statistics for ALL sessions in a single query
  const sessionIds = sessions.map(s => s.id);
  
  // Single batch query for all session stats
  const allStats = sessionIds.length > 0 ? await AttendanceRecord.findAll({
    where: { attendance_session_id: { [Op.in]: sessionIds } },
    attributes: [
      'attendance_session_id',
      'status',
      [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
    ],
    group: ['attendance_session_id', 'status'],
    raw: true,
  }) : [];

  // Build stats map: session_id -> { present, late, leave, absent, total }
  const statsMap = {};
  sessionIds.forEach(id => {
    statsMap[id] = { present: 0, late: 0, leave: 0, absent: 0, total: 0 };
  });
  allStats.forEach(row => {
    const sessionId = row.attendance_session_id;
    const status = row.status;
    const count = parseInt(row.count);
    if (statsMap[sessionId]) {
      statsMap[sessionId][status] = count;
      statsMap[sessionId].total += count;
    }
  });

  // Map sessions with stats (no additional queries)
  const sessionsWithStats = sessions.map(session => {
    // Add computed status based on time
    const sessionData = addComputedStatus(session);
    
    // Add course_section_ids for frontend compatibility
    const sectionIds = session.sections?.map(s => s.id) || 
      (session.course_section_id ? [session.course_section_id] : []);
    
    return {
      ...sessionData,
      course_section_ids: sectionIds,
      stats: statsMap[session.id] || { present: 0, late: 0, leave: 0, absent: 0, total: 0 },
    };
  });

  res.json({
    success: true,
    data: sessionsWithStats,
  });
});

/**
 * Get single attendance session with records
 * GET /api/attendance/:id
 */
const getAttendanceSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await AttendanceSession.findByPk(id, {
    include: [
      {
        model: CourseSection,
        as: 'section',
        attributes: ['id', 'section_no'],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'year', 'semester'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'full_name'],
      },
      {
        model: AttendanceRecord,
        as: 'records',
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'student_id', 'full_name', 'email'],
          },
        ],
        order: [['check_in_time', 'DESC']],
      },
    ],
  });

  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // Get total students in section/course
  let totalStudents = 0;
  if (session.course_section_id) {
    totalStudents = await CourseSectionStudent.count({
      where: { course_section_id: session.course_section_id },
    });
  } else {
    // All sections
    const sections = await CourseSection.findAll({
      where: { course_id: session.course_id },
    });
    const sectionIds = sections.map((s) => s.id);
    totalStudents = await CourseSectionStudent.count({
      where: { course_section_id: { [Op.in]: sectionIds } },
    });
  }

  // Calculate statistics
  const stats = {
    total_students: totalStudents,
    present: session.records.filter((r) => r.status === 'present').length,
    late: session.records.filter((r) => r.status === 'late').length,
    leave: session.records.filter((r) => r.status === 'leave').length,
    absent: session.records.filter((r) => r.status === 'absent').length,
    checked_in: session.records.filter((r) => r.status !== 'absent').length,
    not_checked_in: 0,
  };
  stats.not_checked_in = totalStudents - stats.checked_in;

  // Add computed status based on time
  res.json({
    success: true,
    data: {
      ...addComputedStatus(session),
      stats,
    },
  });
});

/**
 * Create new attendance session
 * POST /api/attendance
 */
const createAttendanceSession = asyncHandler(async (req, res) => {
  const {
    course_id,
    course_section_id,
    course_section_ids, // New: array of section IDs
    title,
    session_type,
    check_location,
    location_lat,
    location_lng,
    radius_meters,
    start_time,
    end_time,
    late_threshold_minutes,
    late_threshold_time, // Absolute time for late check (e.g., "08:15:00")
  } = req.body;

  if (!course_id || !title || !start_time || !end_time) {
    throw new ApiError(400, 'course_id, title, start_time and end_time are required');
  }

  // Generate PIN
  const pin_code = generatePIN();

  // Determine which section IDs to use
  // Priority: course_section_ids (array) > course_section_id (single)
  const sectionIds = course_section_ids && course_section_ids.length > 0
    ? course_section_ids
    : (course_section_id ? [course_section_id] : []);

  // For legacy compatibility, store single section_id
  const legacySectionId = sectionIds.length === 1 ? sectionIds[0] : null;

  const transaction = await sequelize.transaction();

  try {
    // Status will be computed from time, no need to store in DB
    const session = await AttendanceSession.create({
      course_id,
      course_section_id: legacySectionId, // Legacy field for backward compatibility
      title,
      pin_code,
      session_type: session_type || 'lecture',
      check_location: check_location || false,
      location_lat: check_location ? location_lat : null,
      location_lng: check_location ? location_lng : null,
      radius_meters: radius_meters || 50,
      start_time,
      end_time,
      late_threshold_minutes: late_threshold_minutes || 15,
      late_threshold_time: late_threshold_time || null, // Absolute time for late check
      status: 'draft', // Default value, but will be computed from time when queried
      created_by: req.user.id,
    }, { transaction });

    // Create records in junction table for selected sections
    if (sectionIds.length > 0) {
      const sectionLinks = sectionIds.map(sectionId => ({
        attendance_session_id: session.id,
        course_section_id: sectionId,
      }));
      await AttendanceSessionSection.bulkCreate(sectionLinks, { transaction });
    }

    // Pre-create attendance records for students in selected sections
    let studentIds = [];
    if (sectionIds.length > 0) {
      // Get students from selected sections
      const enrollments = await CourseSectionStudent.findAll({
        where: { course_section_id: { [Op.in]: sectionIds } },
        transaction,
      });
      studentIds = [...new Set(enrollments.map((e) => e.student_id))];
    } else {
      // All sections (no specific sections selected)
      const sections = await CourseSection.findAll({
        where: { course_id },
        transaction,
      });
      const allSectionIds = sections.map((s) => s.id);
      const enrollments = await CourseSectionStudent.findAll({
        where: { course_section_id: { [Op.in]: allSectionIds } },
        transaction,
      });
      studentIds = [...new Set(enrollments.map((e) => e.student_id))];
    }

    // Bulk create records
    const records = studentIds.map((student_id) => ({
      attendance_session_id: session.id,
      student_id,
      status: 'absent',
    }));

    if (records.length > 0) {
      await AttendanceRecord.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    // Return response with section info
    const responseData = {
      ...addComputedStatus(session),
      course_section_ids: sectionIds, // Include selected section IDs in response
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: `Created attendance session with ${records.length} student records`,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

/**
 * Update attendance session
 * PUT /api/attendance/:id
 */
const updateAttendanceSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const session = await AttendanceSession.findByPk(id);
  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // If regenerating PIN
  if (updateData.regenerate_pin) {
    updateData.pin_code = generatePIN();
    delete updateData.regenerate_pin;
  }

  // Remove status from updateData - status is computed from time
  delete updateData.status;

  // Handle course_section_ids (multi-select)
  let sectionIds = null;
  if (updateData.course_section_ids !== undefined) {
    sectionIds = updateData.course_section_ids;
    // Set legacy field for backward compatibility
    updateData.course_section_id = sectionIds.length === 1 ? sectionIds[0] : null;
    // Remove course_section_ids from updateData (not a DB column)
    delete updateData.course_section_ids;
  }

  const transaction = await sequelize.transaction();

  try {
    await session.update(updateData, { transaction });

    // Update junction table if section IDs were provided
    if (sectionIds !== null) {
      // Delete existing section links
      await AttendanceSessionSection.destroy({
        where: { attendance_session_id: id },
        transaction,
      });

      // Create new section links
      if (sectionIds.length > 0) {
        const sectionLinks = sectionIds.map(sectionId => ({
          attendance_session_id: parseInt(id),
          course_section_id: sectionId,
        }));
        await AttendanceSessionSection.bulkCreate(sectionLinks, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated session with sections
    const updatedSession = await AttendanceSession.findByPk(id, {
      include: [
        {
          model: CourseSection,
          as: 'sections',
          attributes: ['id', 'section_no'],
          through: { attributes: [] },
        },
      ],
    });

    const sessionWithStatus = addComputedStatus(updatedSession);
    const responseSectionIds = updatedSession.sections?.map(s => s.id) || [];

    // Emit update to connected clients
    emitToAttendance(id, 'session-updated', sessionWithStatus);

    res.json({
      success: true,
      data: {
        ...sessionWithStatus,
        course_section_ids: responseSectionIds,
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

/**
 * Activate attendance session - Now just extends time if needed
 * POST /api/attendance/:id/activate
 * @deprecated Status is now computed from time. Use update to change start_time/end_time instead.
 */
const activateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await AttendanceSession.findByPk(id);
  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  const computedStatus = computeSessionStatus(session);
  
  // If session is before start time, update start_time to now
  if (computedStatus === 'draft') {
    const now = new Date();
    await session.update({ start_time: now.toISOString() });
  }

  const sessionWithStatus = addComputedStatus(session);
  emitToAttendance(id, 'session-activated', { session_id: id });

  res.json({
    success: true,
    message: 'Session activated',
    data: sessionWithStatus,
  });
});

/**
 * Close attendance session - Now just sets end_time to now
 * POST /api/attendance/:id/close
 * @deprecated Status is now computed from time. Use update to change end_time instead.
 */
const closeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await AttendanceSession.findByPk(id);
  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // Set end_time to now to close the session
  const now = new Date();
  await session.update({ end_time: now.toISOString() });

  const sessionWithStatus = addComputedStatus(session);
  emitToAttendance(id, 'session-closed', { session_id: id });

  res.json({
    success: true,
    message: 'Session closed',
    data: sessionWithStatus,
  });
});

/**
 * Delete attendance session
 * DELETE /api/attendance/:id
 */
const deleteAttendanceSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await AttendanceSession.findByPk(id);
  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // Delete all records first
  await AttendanceRecord.destroy({
    where: { attendance_session_id: id },
  });

  await session.destroy();

  res.json({
    success: true,
    message: 'Attendance session deleted',
  });
});

/**
 * Update student attendance status (manual by instructor)
 * PUT /api/attendance/:id/records/:recordId
 */
const updateAttendanceRecord = asyncHandler(async (req, res) => {
  const { id, recordId } = req.params;
  const { status, note } = req.body;

  const record = await AttendanceRecord.findOne({
    where: {
      id: recordId,
      attendance_session_id: id,
    },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_id', 'full_name'],
      },
    ],
  });

  if (!record) {
    throw new ApiError(404, 'Attendance record not found');
  }

  await record.update({
    status,
    note: note || record.note,
    updated_by: req.user.id,
  });

  // Emit update
  emitToAttendance(id, 'record-updated', record.toJSON());

  res.json({
    success: true,
    data: record,
  });
});

/**
 * Get all records for a session (for table display)
 * GET /api/attendance/:id/records
 */
const getAttendanceRecords = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;

  const whereClause = { attendance_session_id: id };
  if (status) {
    whereClause.status = status;
  }

  const records = await AttendanceRecord.findAll({
    where: whereClause,
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_id', 'full_name', 'email'],
      },
    ],
    order: [
      ['status', 'ASC'],
      ['check_in_time', 'ASC'],
    ],
  });

  res.json({
    success: true,
    data: records,
  });
});

// ============================================
// Student Endpoints
// ============================================

/**
 * Get session info for student check-in page
 * GET /api/attendance/check-in/:sessionId/info
 */
const getSessionInfo = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await AttendanceSession.findByPk(sessionId, {
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'year', 'semester'],
      },
      {
        model: CourseSection,
        as: 'section',
        attributes: ['id', 'section_no'],
      },
    ],
    attributes: [
      'id',
      'title',
      'session_type',
      'check_location',
      'start_time',
      'end_time',
      'status',
    ],
  });

  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // Add computed status
  const sessionWithStatus = addComputedStatus(session);

  res.json({
    success: true,
    data: sessionWithStatus,
  });
});

/**
 * Student check-in
 * POST /api/attendance/check-in/:sessionId
 */
const studentCheckIn = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { pin_code, google_email, google_id, location_lat, location_lng } = req.body;

  // Get session
  const session = await AttendanceSession.findByPk(sessionId);
  if (!session) {
    throw new ApiError(404, 'Attendance session not found');
  }

  // Compute status from time
  const computedStatus = computeSessionStatus(session);

  // Check if session is active
  if (computedStatus !== 'active') {
    if (computedStatus === 'draft') {
      throw new ApiError(400, 'การเช็คชื่อยังไม่เริ่ม');
    } else {
      throw new ApiError(400, 'การเช็คชื่อปิดไปแล้ว');
    }
  }

  // Check time (additional check - redundant but explicit)
  const now = new Date();
  if (now < new Date(session.start_time)) {
    throw new ApiError(400, 'การเช็คชื่อยังไม่เริ่ม');
  }
  if (now > new Date(session.end_time)) {
    throw new ApiError(400, 'หมดเวลาเช็คชื่อแล้ว');
  }

  // Verify PIN
  if (pin_code !== session.pin_code) {
    throw new ApiError(400, 'รหัส PIN ไม่ถูกต้อง');
  }

  // Find student by Google email
  const student = await Student.findOne({
    where: { email: google_email },
  });

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษาในระบบ กรุณาติดต่อผู้สอน');
  }

  // Find existing record
  const record = await AttendanceRecord.findOne({
    where: {
      attendance_session_id: sessionId,
      student_id: student.id,
    },
  });

  if (!record) {
    throw new ApiError(404, 'คุณไม่ได้ลงทะเบียนในรายวิชานี้');
  }

  // Check if already checked in
  if (record.status !== 'absent') {
    throw new ApiError(400, 'คุณได้เช็คชื่อไปแล้ว');
  }

  // Check location if required
  let location_verified = false;
  let distance_meters = null;

  if (session.check_location) {
    if (!location_lat || !location_lng) {
      throw new ApiError(400, 'กรุณาอนุญาตการเข้าถึงตำแหน่ง');
    }

    distance_meters = calculateDistance(
      parseFloat(session.location_lat),
      parseFloat(session.location_lng),
      parseFloat(location_lat),
      parseFloat(location_lng)
    );

    if (distance_meters > session.radius_meters) {
      throw new ApiError(400, `คุณอยู่นอกพื้นที่ที่กำหนด (ห่าง ${distance_meters} เมตร)`);
    }

    location_verified = true;
  }

  // Determine status (present or late)
  // Use late_threshold_time if available, otherwise calculate from late_threshold_minutes
  let lateThreshold;
  if (session.late_threshold_time) {
    // Parse the absolute time (e.g., "08:15:00") and combine with session date
    const sessionDate = new Date(session.start_time);
    const [hours, minutes, seconds = 0] = session.late_threshold_time.split(':').map(Number);
    lateThreshold = new Date(sessionDate);
    lateThreshold.setHours(hours, minutes, seconds, 0);
  } else {
    // Fallback to relative minutes
    lateThreshold = new Date(session.start_time);
    lateThreshold.setMinutes(lateThreshold.getMinutes() + session.late_threshold_minutes);
  }

  const status = now > lateThreshold ? 'late' : 'present';

  // Update record
  await record.update({
    check_in_time: now,
    status,
    google_email,
    google_id,
    pin_verified: true,
    location_verified,
    location_lat: location_lat || null,
    location_lng: location_lng || null,
    distance_meters,
  });

  // Get updated record with student info
  const updatedRecord = await AttendanceRecord.findByPk(record.id, {
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_id', 'full_name', 'email'],
      },
    ],
  });

  // Emit to instructor in real-time
  emitToInstructor(sessionId, 'student-checked-in', { record: updatedRecord.toJSON() });

  res.json({
    success: true,
    message: status === 'present' ? 'เช็คชื่อสำเร็จ: มาเรียน' : 'เช็คชื่อสำเร็จ: มาสาย',
    data: {
      status,
      student: updatedRecord.student,
      check_in_time: now,
      location_verified,
      distance_meters,
    },
  });
});

/**
 * Verify student by Google email (before check-in)
 * POST /api/attendance/verify-student
 */
const verifyStudent = asyncHandler(async (req, res) => {
  const { google_email, session_id } = req.body;

  if (!google_email) {
    throw new ApiError(400, 'google_email is required');
  }

  const student = await Student.findOne({
    where: { email: google_email },
    attributes: ['id', 'student_id', 'full_name', 'email'],
  });

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษาในระบบ');
  }

  // If session_id provided, check if student is enrolled
  if (session_id) {
    const session = await AttendanceSession.findByPk(session_id);
    if (session) {
      const record = await AttendanceRecord.findOne({
        where: {
          attendance_session_id: session_id,
          student_id: student.id,
        },
      });

      if (!record) {
        throw new ApiError(404, 'คุณไม่ได้ลงทะเบียนในรายวิชานี้');
      }

      // Check if already checked in
      if (record.status !== 'absent') {
        return res.json({
          success: true,
          data: {
            student,
            already_checked_in: true,
            status: record.status,
            check_in_time: record.check_in_time,
          },
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      student,
      already_checked_in: false,
    },
  });
});

module.exports = {
  // Instructor/TA
  getAttendanceSessions,
  getAttendanceSession,
  createAttendanceSession,
  updateAttendanceSession,
  activateSession,
  closeSession,
  deleteAttendanceSession,
  updateAttendanceRecord,
  getAttendanceRecords,
  // Student
  getSessionInfo,
  studentCheckIn,
  verifyStudent,
};
