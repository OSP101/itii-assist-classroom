/**
 * Course Controller - Handle course-related requests
 */

const { Course, CourseSection, CourseTA, CourseSectionStudent, User, Student } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Check if user has access to course (is admin, instructor, or TA of course)
 */
const checkCourseAccess = async (courseId, user) => {
  if (user.role === 'admin') return true;
  
  const course = await Course.findByPk(courseId);
  if (!course) return false;
  
  // Check if user is the instructor
  if (user.role === 'instructor' && course.instructor_id === user.id) return true;
  
  // Check if user is a TA of this course
  if (user.role === 'ta' || user.role === 'instructor') {
    const isTA = await CourseTA.findOne({
      where: { course_id: courseId, user_id: user.id }
    });
    if (isTA) return true;
  }
  
  return false;
};

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

  // Build where clause with proper AND/OR structure
  const whereConditions = [];

  // Search filter (OR between code and name)
  if (search && search.trim()) {
    whereConditions.push({
      [Op.or]: [
        { code: { [Op.like]: `%${search.trim()}%` } },
        { name: { [Op.like]: `%${search.trim()}%` } },
      ],
    });
  }

  // Year filter
  if (year && !isNaN(parseInt(year))) {
    whereConditions.push({ year: parseInt(year) });
  }

  // Semester filter
  if (semester && !isNaN(parseInt(semester))) {
    whereConditions.push({ semester: parseInt(semester) });
  }

  // Status filter
  if (status === 'active') {
    whereConditions.push({ is_active: true });
  } else if (status === 'inactive') {
    whereConditions.push({ is_active: false });
  }

  // Combine all conditions with AND
  const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

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
  const currentUser = req.user;

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

  // Determine instructor_id
  let finalInstructorId = instructor_id || null;
  
  // If instructor creates the course and no instructor_id provided, use their own id
  if (!instructor_id && currentUser.role === 'instructor') {
    finalInstructorId = currentUser.id;
  }

  // Validate instructor if provided
  if (finalInstructorId) {
    const instructor = await User.findOne({
      where: { id: finalInstructorId, role: 'instructor' },
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
    instructor_id: finalInstructorId,
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
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

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
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

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
  const currentUser = req.user;

  // Check course access (only admin or instructor of this course)
  if (currentUser.role !== 'admin') {
    const course = await Course.findByPk(id);
    if (!course || course.instructor_id !== currentUser.id) {
      throw new ApiError(403, 'คุณไม่มีสิทธิ์เพิ่มผู้ช่วยสอนในรายวิชานี้');
    }
  }

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
  const currentUser = req.user;

  // Check course access (only admin or instructor of this course)
  if (currentUser.role !== 'admin') {
    const course = await Course.findByPk(id);
    if (!course || course.instructor_id !== currentUser.id) {
      throw new ApiError(403, 'คุณไม่มีสิทธิ์นำผู้ช่วยสอนออกจากรายวิชานี้');
    }
  }

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
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

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
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

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

  // Check if student already in ANY section of this course
  const sectionsInCourse = await CourseSection.findAll({
    where: { course_id: id },
    attributes: ['id'],
  });
  const sectionIds = sectionsInCourse.map(s => s.id);
  
  const existingInCourse = await CourseSectionStudent.findOne({
    where: { 
      course_section_id: { [Op.in]: sectionIds },
      student_id 
    },
  });
  if (existingInCourse) {
    throw new ApiError(400, 'นักศึกษานี้อยู่ในรายวิชานี้แล้ว');
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
 * Bulk add students to section
 * @route POST /api/courses/:id/sections/:sectionId/students/bulk
 */
const bulkAddStudentsToSection = asyncHandler(async (req, res) => {
  const { id, sectionId } = req.params;
  const { student_ids } = req.body;
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

  const section = await CourseSection.findOne({
    where: { id: sectionId, course_id: id },
  });
  if (!section) {
    throw new ApiError(404, 'ไม่พบกลุ่มเรียน');
  }

  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    throw new ApiError(400, 'กรุณาระบุรายชื่อนักศึกษา');
  }

  // Get all sections in this course to check for duplicates
  const sectionsInCourse = await CourseSection.findAll({
    where: { course_id: id },
    attributes: ['id'],
  });
  const sectionIds = sectionsInCourse.map(s => s.id);

  // Get already enrolled students in this course
  const existingEnrollments = await CourseSectionStudent.findAll({
    where: { 
      course_section_id: { [Op.in]: sectionIds },
      student_id: { [Op.in]: student_ids }
    },
    attributes: ['student_id'],
  });
  const alreadyEnrolledIds = new Set(existingEnrollments.map(e => e.student_id));

  // Filter out already enrolled students
  const newStudentIds = student_ids.filter(id => !alreadyEnrolledIds.has(id));

  if (newStudentIds.length === 0) {
    throw new ApiError(400, 'นักศึกษาทั้งหมดอยู่ในรายวิชานี้แล้ว');
  }

  // Verify all students exist
  const students = await Student.findAll({
    where: { id: { [Op.in]: newStudentIds } },
  });
  const validStudentIds = students.map(s => s.id);

  // Bulk create enrollments
  const enrollments = validStudentIds.map(studentId => ({
    course_section_id: parseInt(sectionId),
    student_id: studentId,
  }));

  await CourseSectionStudent.bulkCreate(enrollments, { ignoreDuplicates: true });

  res.status(201).json({
    success: true,
    message: `เพิ่มนักศึกษาสำเร็จ ${validStudentIds.length} คน`,
    data: {
      addedCount: validStudentIds.length,
      skippedCount: student_ids.length - validStudentIds.length,
      addedStudentIds: validStudentIds,
    },
  });
});

/**
 * Remove student from section
 * @route DELETE /api/courses/:id/sections/:sectionId/students/:studentId
 */
const removeStudentFromSection = asyncHandler(async (req, res) => {
  const { id, sectionId, studentId } = req.params;
  const currentUser = req.user;

  // Check course access
  const hasAccess = await checkCourseAccess(id, currentUser);
  if (!hasAccess) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงรายวิชานี้');
  }

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

/**
 * Get my courses (for instructor/TA)
 * @route GET /api/courses/my-courses
 */
const getMyCourses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    page = 1,
    limit = 12,
    search = '',
    year = '',
    semester = '',
    status = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  // Debug log
  console.log('getMyCourses params:', { page, limit, search, year, semester, status, userId, userRole });

  // Build where clause with proper AND/OR structure
  const whereConditions = [];

  // For instructor - get courses they own
  if (userRole === 'instructor') {
    whereConditions.push({ instructor_id: userId });
  }

  // Search filter (OR between code and name)
  if (search && search.trim()) {
    whereConditions.push({
      [Op.or]: [
        { code: { [Op.like]: `%${search.trim()}%` } },
        { name: { [Op.like]: `%${search.trim()}%` } },
      ],
    });
  }

  // Year filter
  if (year && !isNaN(parseInt(year))) {
    whereConditions.push({ year: parseInt(year) });
  }

  // Semester filter
  if (semester && !isNaN(parseInt(semester))) {
    whereConditions.push({ semester: parseInt(semester) });
  }

  // Status filter
  if (status === 'active') {
    whereConditions.push({ is_active: true });
  } else if (status === 'inactive') {
    whereConditions.push({ is_active: false });
  }

  // Combine all conditions with AND
  const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

  // Debug log
  console.log('getMyCourses whereConditions:', JSON.stringify(whereConditions, null, 2));
  console.log('getMyCourses final where:', JSON.stringify(where, null, 2));

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Valid sort columns
  const validSortColumns = ['code', 'name', 'year', 'semester', 'is_active', 'created_at', 'updated_at'];
  const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let courses, count;

  if (userRole === 'ta') {
    // For TA - get courses they are assigned to
    const { count: taCount, rows: taCourses } = await Course.findAndCountAll({
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
        {
          model: User,
          as: 'tas',
          attributes: ['id'],
          through: { attributes: [] },
          where: { id: userId },
          required: true, // INNER JOIN - only courses where this TA is assigned
        },
      ],
    });
    courses = taCourses;
    count = taCount;
  } else {
    // For instructor - courses they own
    const { count: instructorCount, rows: instructorCourses } = await Course.findAndCountAll({
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
    courses = instructorCourses;
    count = instructorCount;
  }

  // Get TA count and student count for each course
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
 * Get my courses stats (for instructor/TA)
 * @route GET /api/courses/my-courses/stats
 */
const getMyCoursesStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let courseIds = [];

  if (userRole === 'instructor') {
    // Get courses where user is instructor
    const courses = await Course.findAll({
      where: { instructor_id: userId },
      attributes: ['id'],
      raw: true,
    });
    courseIds = courses.map(c => c.id);
  } else if (userRole === 'ta') {
    // Get courses where user is TA
    const taAssignments = await CourseTA.findAll({
      where: { user_id: userId },
      attributes: ['course_id'],
      raw: true,
    });
    courseIds = taAssignments.map(t => t.course_id);
  }

  // Count stats
  const total = courseIds.length;
  
  let active = 0;
  let inactive = 0;
  let years = [];
  
  if (total > 0) {
    active = await Course.count({ 
      where: { 
        id: courseIds, 
        is_active: true 
      } 
    });
    inactive = await Course.count({ 
      where: { 
        id: courseIds, 
        is_active: false 
      } 
    });

    // Get unique years
    const yearsResult = await Course.findAll({
      where: { id: courseIds },
      attributes: ['year'],
      group: ['year'],
      order: [['year', 'DESC']],
      raw: true,
    });
    years = yearsResult.map(y => y.year);
  }

  res.json({
    success: true,
    data: {
      total,
      byStatus: {
        active,
        inactive,
      },
      years,
    },
  });
});

/**
 * Get course overview dashboard data
 * @route GET /api/courses/:id/overview
 */
const getCourseOverview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get course with sections
  const course = await Course.findByPk(id, {
    include: [
      {
        model: CourseSection,
        as: 'sections',
        attributes: ['id', 'section_no'],
      },
      {
        model: User,
        as: 'tas',
        attributes: ['id', 'full_name', 'email', 'avatar'],
        through: { attributes: ['assigned_at'] },
      },
    ],
  });

  if (!course) {
    throw new ApiError(404, 'ไม่พบข้อมูลรายวิชา');
  }

  // Get all students in course
  const sectionIds = course.sections.map(s => s.id);
  
  let allStudents = [];
  let totalStudents = 0;

  if (sectionIds.length > 0) {
    const enrollments = await CourseSectionStudent.findAll({
      where: { course_section_id: sectionIds },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'student_id', 'full_name', 'email', 'is_active'],
        },
        {
          model: CourseSection,
          as: 'section',
          attributes: ['id', 'section_no'],
        },
      ],
    });

    allStudents = enrollments.map(e => ({
      id: e.student.id,
      student_id: e.student.student_id,
      full_name: e.student.full_name,
      email: e.student.email,
      section_id: e.section.id,
      section_no: e.section.section_no,
      enrolled_at: e.enrolled_at || e.createdAt,
    }));

    totalStudents = allStudents.length;
  }

  // Real data - no mock (waiting for Assignment model)
  // When Assignment model exists, calculate from actual submissions
  
  // TA activity - real data only
  const taActivity = (course.tas || []).map(ta => ({
    id: ta.id,
    full_name: ta.full_name,
    email: ta.email,
    assignedAt: ta.CourseTA?.assigned_at,
    gradedCount: 0, // Will be real when assignments exist
    lastActive: null, // Will be real when assignments exist
    avatar: ta.avatar,
  }));

  // Course summary - real data only
  const summary = {
    totalStudents,
    totalSections: course.sections.length,
    totalTAs: (course.tas || []).length,
    totalAssignments: 0, // Will be real when assignments exist
    submissionRate: 0, // Will be real when assignments exist
    trend: null, // Will be real when assignments exist
    trendValue: 0,
  };

  res.json({
    success: true,
    data: {
      summary,
      topStudents: [], // Will be real when assignments exist (need scores)
      lowPerformers: [], // Will be real when assignments exist (need scores)
      taActivity,
      assignments: [], // Will be real when assignments exist
    },
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
  bulkAddStudentsToSection,
  removeStudentFromSection,
  getInstructors,
  getTAsList,
  getMyCourses,
  getMyCoursesStats,
  getCourseOverview,
};
