/**
 * Student Controller - Handle student-related requests
 */

const { Student } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all students with pagination and filters
 * @route GET /api/students
 */
const getStudents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  // Build where clause
  const where = {};

  // Search filter
  if (search) {
    where[Op.or] = [
      { student_id: { [Op.like]: `%${search}%` } },
      { full_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  // Status filter
  if (status === 'active') {
    where.is_active = true;
  } else if (status === 'inactive') {
    where.is_active = false;
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Valid sort columns
  const validSortColumns = ['student_id', 'full_name', 'email', 'is_active', 'created_at', 'updated_at'];
  const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Query students
  const { count, rows: students } = await Student.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [[orderColumn, orderDirection]],
    attributes: ['id', 'student_id', 'full_name', 'email', 'extra', 'is_active', 'created_at', 'updated_at'],
  });

  // Calculate pagination info
  const totalPages = Math.ceil(count / parseInt(limit));

  res.json({
    success: true,
    data: {
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasMore: parseInt(page) < totalPages,
      },
    },
  });
});

/**
 * Get student statistics
 * @route GET /api/students/stats
 */
const getStudentStats = asyncHandler(async (req, res) => {
  const total = await Student.count();
  const active = await Student.count({ where: { is_active: true } });
  const inactive = await Student.count({ where: { is_active: false } });

  res.json({
    success: true,
    data: {
      total,
      byStatus: {
        active,
        inactive,
      },
    },
  });
});

/**
 * Get single student by ID
 * @route GET /api/students/:id
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id);

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษา');
  }

  res.json({
    success: true,
    data: student,
  });
});

/**
 * Create new student
 * @route POST /api/students
 */
const createStudent = asyncHandler(async (req, res) => {
  const { student_id, full_name, email, extra } = req.body;

  // Validate required fields
  if (!student_id || !full_name || !email) {
    throw new ApiError(400, 'กรุณากรอกรหัสนักศึกษา ชื่อ-นามสกุล และอีเมล');
  }

  // Check if student_id already exists
  const existingStudent = await Student.findOne({ where: { student_id } });
  if (existingStudent) {
    throw new ApiError(400, 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await Student.findOne({ where: { email } });
    if (existingEmail) {
      throw new ApiError(400, 'อีเมลนี้มีอยู่ในระบบแล้ว');
    }
  }

  // Create student
  const student = await Student.create({
    student_id,
    full_name,
    email,
    extra: extra || null,
    is_active: true,
  });

  res.status(201).json({
    success: true,
    message: 'สร้างข้อมูลนักศึกษาสำเร็จ',
    data: student,
  });
});

/**
 * Update student
 * @route PUT /api/students/:id
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { student_id, full_name, email, extra, is_active } = req.body;

  // Validate required fields
  if (!student_id || !full_name || !email) {
    throw new ApiError(400, 'กรุณากรอกรหัสนักศึกษา ชื่อ-นามสกุล และอีเมล');
  }

  const student = await Student.findByPk(id);

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษา');
  }

  // Check if student_id is being changed and already exists
  if (student_id && student_id !== student.student_id) {
    const existingStudent = await Student.findOne({ where: { student_id } });
    if (existingStudent) {
      throw new ApiError(400, 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว');
    }
  }

  // Check if email is being changed and already exists
  if (email && email !== student.email) {
    const existingEmail = await Student.findOne({ where: { email } });
    if (existingEmail) {
      throw new ApiError(400, 'อีเมลนี้มีอยู่ในระบบแล้ว');
    }
  }

  // Update student
  await student.update({
    student_id: student_id || student.student_id,
    full_name: full_name || student.full_name,
    email: email || student.email,
    extra: extra !== undefined ? extra : student.extra,
    is_active: is_active !== undefined ? is_active : student.is_active,
  });

  res.json({
    success: true,
    message: 'อัปเดตข้อมูลนักศึกษาสำเร็จ',
    data: student,
  });
});

/**
 * Delete student
 * @route DELETE /api/students/:id
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id);

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษา');
  }

  await student.destroy();

  res.json({
    success: true,
    message: 'ลบข้อมูลนักศึกษาสำเร็จ',
  });
});

/**
 * Toggle student active status
 * @route PATCH /api/students/:id/status
 */
const toggleStudentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id);

  if (!student) {
    throw new ApiError(404, 'ไม่พบข้อมูลนักศึกษา');
  }

  await student.update({
    is_active: !student.is_active,
  });

  res.json({
    success: true,
    message: student.is_active ? 'เปิดใช้งานนักศึกษาแล้ว' : 'ปิดใช้งานนักศึกษาแล้ว',
    data: student,
  });
});

/**
 * Import students from CSV/Excel data
 * @route POST /api/students/import
 */
const importStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    throw new ApiError(400, 'กรุณาส่งข้อมูลนักศึกษาที่ต้องการนำเข้า');
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const studentData of students) {
    try {
      const { student_id, full_name, email, extra } = studentData;

      if (!student_id || !full_name) {
        results.failed++;
        results.errors.push({ student_id, error: 'ข้อมูลไม่ครบถ้วน' });
        continue;
      }

      // Check if already exists
      const existing = await Student.findOne({ where: { student_id } });
      if (existing) {
        // Update existing student
        await existing.update({ full_name, email, extra });
        results.success++;
      } else {
        // Create new student
        await Student.create({
          student_id,
          full_name,
          email: email || null,
          extra: extra || null,
          is_active: true,
        });
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ 
        student_id: studentData.student_id, 
        error: error.message 
      });
    }
  }

  res.json({
    success: true,
    message: `นำเข้าสำเร็จ ${results.success} รายการ, ล้มเหลว ${results.failed} รายการ`,
    data: results,
  });
});

module.exports = {
  getStudents,
  getStudentStats,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleStudentStatus,
  importStudents,
};
