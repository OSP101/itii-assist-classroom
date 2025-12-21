/**
 * Course Controller - Handle course-related requests
 */

const { Course, CourseSection, CourseTA, CourseSectionStudent, User, Student } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all courses with pagination and filters
 * @route GET /api/courses
 */
const getCourses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    year = '',
    semester = '',
    status = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  // Build where clause
  const where = {};

  // Search filter
  if (search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
    ];
  }

  // Year filter
  if (year) {
    where.year = parseInt(year);
  }

  // Semester filter
  if (semester) {
    where.semester = parseInt(semester);
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
  const validSortColumns = ['code', 'name', 'year', 'semester', 'is_active', 'created_at', 'updated_at'];
  const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Query courses
  const { count, rows: courses } = await Course.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [[orderColumn, orderDirection]],
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'full_name', 'email'],
      },
      {
        model: CourseSection,
        as: 'sections',
        attributes: ['id', 'section_no', 'note'],
      },
    ],
  });

  // Get TA count for each course
  const coursesWithCounts = await Promise.all(
    courses.map(async (course) => {
      const taCount = await CourseTA.count({ where: { course_id: course.id } });
      const studentCount = await CourseSectionStudent.count({
        include: [{
          model: CourseSection,
          as: 'section',
          where: { course_id: course.id },
          attributes: [],
        }],
      });
      return {
        ...course.toJSON(),
        taCount,
        studentCount,
      };
    })
  );

  // Calculate pagination info
  const totalPages = Math.ceil(count / parseInt(limit));

  res.json({
    success: true,
    data: {
      courses: coursesWithCounts,
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
 * Get course statistics
 * @route GET /api/courses/stats
 */
const getCourseStats = asyncHandler(async (req, res) => {
  const total = await Course.count();
  const active = await Course.count({ where: { is_active: true } });
  const inactive = await Course.count({ where: { is_active: false } });

  // Get current year courses
  const currentYear = new Date().getFullYear() + 543; // พ.ศ.
  const thisYear = await Course.count({ where: { year: currentYear } });

  // Get unique years
  const years = await Course.findAll({
    attributes: ['year'],
    group: ['year'],
    order: [['year', 'DESC']],
    raw: true,
  });

  res.json({
    success: true,
    data: {
      total,
      byStatus: {
        active,
        inactive,
      },
      thisYear,
      years: years.map(y => y.year),
    },
  });
});

/**
 * Get single course by ID
 * @route GET /api/courses/:id
 */
const getCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id, {
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'full_name', 'email', 'username'],
      },
      {
        model: CourseSection,
        as: 'sections',
        attributes: ['id', 'section_no', 'note', 'created_at'],
      },
      {
        model: User,
        as: 'tas',
        attributes: ['id', 'full_name', 'email', 'username'],
        through: { attributes: ['assigned_at'] },
      },
    ],
  });

  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  // Get student count per section
  const sectionsWithStudents = await Promise.all(
    course.sections.map(async (section) => {
      const studentCount = await CourseSectionStudent.count({
        where: { course_section_id: section.id },
      });
      return {
        ...section.toJSON(),
        studentCount,
      };
    })
  );

  res.json({
    success: true,
    data: {
      ...course.toJSON(),
      sections: sectionsWithStudents,
    },
  });
});

/**
 * Create new course
 * @route POST /api/courses
 */
const createCourse = asyncHandler(async (req, res) => {
  const { code, name, year, semester, instructor_id, description, image } = req.body;

  // Validate required fields
  if (!code || !name || !year || !semester) {
    throw new ApiError(400, 'กรุณากรอกข้อมูลที่จำเป็น (รหัสวิชา, ชื่อวิชา, ปีการศึกษา, ภาคเรียน)');
  }

  // Check if course already exists
  const existingCourse = await Course.findOne({
    where: { code, year: parseInt(year), semester: parseInt(semester) },
  });
  if (existingCourse) {
    throw new ApiError(400, 'รายวิชานี้มีอยู่ในระบบแล้ว (รหัส-ปี-ภาคเรียน ซ้ำ)');
  }

  // Validate instructor if provided
  if (instructor_id) {
    const instructor = await User.findOne({
      where: { id: instructor_id, role: 'instructor' },
    });
    if (!instructor) {
      throw new ApiError(400, 'ไม่พบอาจารย์ที่ระบุในระบบ');
    }
  }

  // Create course
  const course = await Course.create({
    code,
    name,
    year: parseInt(year),
    semester: parseInt(semester),
    instructor_id: instructor_id || null,
    description: description || null,
    image: image || null,
    is_active: true,
  });

  // Reload with associations
  const createdCourse = await Course.findByPk(course.id, {
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'full_name', 'email'],
      },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'สร้างรายวิชาสำเร็จ',
    data: createdCourse,
  });
});

/**
 * Update course
 * @route PUT /api/courses/:id
 */
const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { code, name, year, semester, instructor_id, description, is_active } = req.body;

  const course = await Course.findByPk(id);

  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  // Check for duplicate if code/year/semester changed
  if (code || year || semester) {
    const checkCode = code || course.code;
    const checkYear = year ? parseInt(year) : course.year;
    const checkSemester = semester ? parseInt(semester) : course.semester;

    const existingCourse = await Course.findOne({
      where: {
        code: checkCode,
        year: checkYear,
        semester: checkSemester,
        id: { [Op.ne]: id },
      },
    });
    if (existingCourse) {
      throw new ApiError(400, 'รายวิชานี้มีอยู่ในระบบแล้ว (รหัส-ปี-ภาคเรียน ซ้ำ)');
    }
  }

  // Validate instructor if provided
  if (instructor_id) {
    const instructor = await User.findOne({
      where: { id: instructor_id, role: 'instructor' },
    });
    if (!instructor) {
      throw new ApiError(400, 'ไม่พบอาจารย์ที่ระบุในระบบ');
    }
  }

  // Update course
  const { image } = req.body;
  await course.update({
    code: code || course.code,
    name: name || course.name,
    year: year ? parseInt(year) : course.year,
    semester: semester ? parseInt(semester) : course.semester,
    instructor_id: instructor_id !== undefined ? instructor_id : course.instructor_id,
    description: description !== undefined ? description : course.description,
    image: image !== undefined ? image : course.image,
    is_active: is_active !== undefined ? is_active : course.is_active,
  });

  // Reload with associations
  const updatedCourse = await Course.findByPk(id, {
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'full_name', 'email'],
      },
    ],
  });

  res.json({
    success: true,
    message: 'อัปเดตรายวิชาสำเร็จ',
    data: updatedCourse,
  });
});

/**
 * Delete course
 * @route DELETE /api/courses/:id
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id);

  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  // Delete related data
  await CourseTA.destroy({ where: { course_id: id } });
  
  // Get sections
  const sections = await CourseSection.findAll({ where: { course_id: id } });
  const sectionIds = sections.map(s => s.id);
  
  // Delete section students
  if (sectionIds.length > 0) {
    await CourseSectionStudent.destroy({ where: { course_section_id: sectionIds } });
  }
  
  // Delete sections
  await CourseSection.destroy({ where: { course_id: id } });
  
  // Delete course
  await course.destroy();

  res.json({
    success: true,
    message: 'ลบรายวิชาสำเร็จ',
  });
});

/**
 * Toggle course status
 * @route PATCH /api/courses/:id/toggle-status
 */
const toggleCourseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id);

  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  await course.update({ is_active: !course.is_active });

  res.json({
    success: true,
    message: course.is_active ? 'เปิดใช้งานรายวิชาสำเร็จ' : 'ปิดใช้งานรายวิชาสำเร็จ',
    data: course,
  });
});

// ============================================
// Section Management
// ============================================

/**
 * Add section to course
 * @route POST /api/courses/:id/sections
 */
const addSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { section_no, note } = req.body;

  const course = await Course.findByPk(id);
  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  if (!section_no) {
    throw new ApiError(400, 'กรุณาระบุหมายเลขกลุ่มเรียน');
  }

  // Check duplicate
  const existingSection = await CourseSection.findOne({
    where: { course_id: id, section_no },
  });
  if (existingSection) {
    throw new ApiError(400, 'กลุ่มเรียนนี้มีอยู่แล้ว');
  }

  const section = await CourseSection.create({
    course_id: id,
    section_no,
    note: note || null,
  });

  res.status(201).json({
    success: true,
    message: 'เพิ่มกลุ่มเรียนสำเร็จ',
    data: section,
  });
});

/**
 * Remove section from course
 * @route DELETE /api/courses/:id/sections/:sectionId
 */
const removeSection = asyncHandler(async (req, res) => {
  const { id, sectionId } = req.params;

  const section = await CourseSection.findOne({
    where: { id: sectionId, course_id: id },
  });

  if (!section) {
    throw new ApiError(404, 'ไม่พบกลุ่มเรียน');
  }

  // Delete students from section
  await CourseSectionStudent.destroy({ where: { course_section_id: sectionId } });

  // Delete section
  await section.destroy();

  res.json({
    success: true,
    message: 'ลบกลุ่มเรียนสำเร็จ',
  });
});

// ============================================
// TA Management
// ============================================

/**
 * Add TA to course
 * @route POST /api/courses/:id/tas
 */
const addTA = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  const course = await Course.findByPk(id);
  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  const ta = await User.findOne({
    where: { id: user_id, role: 'ta' },
  });
  if (!ta) {
    throw new ApiError(400, 'ไม่พบผู้ช่วยสอนที่ระบุ');
  }

  // Check duplicate
  const existing = await CourseTA.findOne({
    where: { course_id: id, user_id },
  });
  if (existing) {
    throw new ApiError(400, 'ผู้ช่วยสอนนี้อยู่ในรายวิชาแล้ว');
  }

  await CourseTA.create({ course_id: id, user_id });

  res.status(201).json({
    success: true,
    message: 'เพิ่มผู้ช่วยสอนสำเร็จ',
    data: ta.toSafeObject(),
  });
});

/**
 * Remove TA from course
 * @route DELETE /api/courses/:id/tas/:userId
 */
const removeTA = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const deleted = await CourseTA.destroy({
    where: { course_id: id, user_id: userId },
  });

  if (!deleted) {
    throw new ApiError(404, 'ไม่พบผู้ช่วยสอนในรายวิชานี้');
  }

  res.json({
    success: true,
    message: 'นำผู้ช่วยสอนออกสำเร็จ',
  });
});

// ============================================
// Student Management
// ============================================

/**
 * Get students in section
 * @route GET /api/courses/:id/sections/:sectionId/students
 */
const getSectionStudents = asyncHandler(async (req, res) => {
  const { id, sectionId } = req.params;

  const section = await CourseSection.findOne({
    where: { id: sectionId, course_id: id },
  });

  if (!section) {
    throw new ApiError(404, 'ไม่พบกลุ่มเรียน');
  }

  const students = await CourseSectionStudent.findAll({
    where: { course_section_id: sectionId },
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'student_id', 'full_name', 'email', 'is_active'],
    }],
    order: [['enrolled_at', 'ASC']],
  });

  res.json({
    success: true,
    data: students.map(s => ({
      ...s.student.toJSON(),
      enrolled_at: s.enrolled_at,
    })),
  });
});

/**
 * Add student to section
 * @route POST /api/courses/:id/sections/:sectionId/students
 */
const addStudentToSection = asyncHandler(async (req, res) => {
  const { id, sectionId } = req.params;
  const { student_id } = req.body;

  const section = await CourseSection.findOne({
    where: { id: sectionId, course_id: id },
  });
  if (!section) {
    throw new ApiError(404, 'ไม่พบกลุ่มเรียน');
  }

  const student = await Student.findByPk(student_id);
  if (!student) {
    throw new ApiError(400, 'ไม่พบนักศึกษาที่ระบุ');
  }

  // Check duplicate
  const existing = await CourseSectionStudent.findOne({
    where: { course_section_id: sectionId, student_id },
  });
  if (existing) {
    throw new ApiError(400, 'นักศึกษานี้อยู่ในกลุ่มเรียนแล้ว');
  }

  await CourseSectionStudent.create({
    course_section_id: sectionId,
    student_id,
  });

  res.status(201).json({
    success: true,
    message: 'เพิ่มนักศึกษาสำเร็จ',
    data: student,
  });
});

/**
 * Remove student from section
 * @route DELETE /api/courses/:id/sections/:sectionId/students/:studentId
 */
const removeStudentFromSection = asyncHandler(async (req, res) => {
  const { sectionId, studentId } = req.params;

  const deleted = await CourseSectionStudent.destroy({
    where: { course_section_id: sectionId, student_id: studentId },
  });

  if (!deleted) {
    throw new ApiError(404, 'ไม่พบนักศึกษาในกลุ่มเรียนนี้');
  }

  res.json({
    success: true,
    message: 'นำนักศึกษาออกสำเร็จ',
  });
});

/**
 * Get instructors list for dropdown
 * @route GET /api/courses/instructors
 */
const getInstructors = asyncHandler(async (req, res) => {
  const instructors = await User.findAll({
    where: { role: 'instructor', is_active: true },
    attributes: ['id', 'full_name', 'email', 'username'],
    order: [['full_name', 'ASC']],
  });

  res.json({
    success: true,
    data: instructors,
  });
});

/**
 * Get TAs list for dropdown
 * @route GET /api/courses/tas-list
 */
const getTAsList = asyncHandler(async (req, res) => {
  const tas = await User.findAll({
    where: { role: 'ta', is_active: true },
    attributes: ['id', 'full_name', 'email', 'username'],
    order: [['full_name', 'ASC']],
  });

  res.json({
    success: true,
    data: tas,
  });
});

module.exports = {
  getCourses,
  getCourseStats,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  addSection,
  removeSection,
  addTA,
  removeTA,
  getSectionStudents,
  addStudentToSection,
  removeStudentFromSection,
  getInstructors,
  getTAsList,
};
