const { ExamSetting, ExamScore, Student, User, CourseSectionStudent, CourseSection, Course, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logCourseActivity } = require('../utils/courseActivityLogger');

/**
 * Helper: check if course is active, throw 403 if not
 */
const ensureCourseActive = async (courseId) => {
    const course = await Course.findByPk(courseId, { attributes: ['id', 'is_active'] });
    if (course && !course.is_active) {
        throw new ApiError(403, 'รายวิชานี้ปิดใช้งานอยู่ กรุณาเปิดใช้งานก่อนทำการแก้ไข');
    }
};

/**
 * Get exam settings for a course
 * GET /courses/:courseId/exam-settings
 */
exports.getExamSettings = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    // Get or create default exam settings
    const examTypes = ['midterm', 'final'];
    const components = ['lab', 'lecture'];

    const settings = await ExamSetting.findAll({
        where: { course_id: courseId },
        order: [
            ['exam_type', 'ASC'],
            ['component', 'ASC'],
        ],
    });

    // If no settings exist, create default settings
    if (settings.length === 0) {
        const defaultSettings = [];
        for (const examType of examTypes) {
            for (const component of components) {
                defaultSettings.push({
                    course_id: courseId,
                    exam_type: examType,
                    component: component,
                    max_score: 0,
                    is_visible: false,
                    is_active: false,
                });
            }
        }
        await ExamSetting.bulkCreate(defaultSettings);
        const newSettings = await ExamSetting.findAll({
            where: { course_id: courseId },
            order: [
                ['exam_type', 'ASC'],
                ['component', 'ASC'],
            ],
        });
        return res.json({ success: true, data: newSettings });
    }

    res.json({ success: true, data: settings });
});

/**
 * Update exam settings
 * PUT /courses/:courseId/exam-settings/:settingId
 */
exports.updateExamSetting = asyncHandler(async (req, res) => {
    const { courseId, settingId } = req.params;
    const { max_score, is_visible, is_active } = req.body;

    await ensureCourseActive(courseId);

    const setting = await ExamSetting.findOne({
        where: { id: settingId, course_id: courseId },
    });

    if (!setting) {
        throw new ApiError(404, 'ไม่พบการตั้งค่าการสอบ');
    }

    await setting.update({
        max_score: max_score !== undefined ? max_score : setting.max_score,
        is_visible: is_visible !== undefined ? is_visible : setting.is_visible,
        is_active: is_active !== undefined ? is_active : setting.is_active,
    });

    // Log activity
    await logCourseActivity(courseId, req.user.id, 'update', 'exam_setting', setting.id, {
        exam_type: setting.exam_type,
        component: setting.component,
        max_score: setting.max_score,
        is_visible: setting.is_visible,
        is_active: setting.is_active,
    });

    res.json({ success: true, data: setting });
});

/**
 * Get exam scores for a course
 * GET /courses/:courseId/exam-scores
 * Query params: exam_type, component, section_id
 */
exports.getExamScores = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { exam_type, component, section_id } = req.query;

    // Build exam setting filter
    const settingFilter = { course_id: courseId, is_active: true };
    if (exam_type) settingFilter.exam_type = exam_type;
    if (component) settingFilter.component = component;

    const examSettings = await ExamSetting.findAll({
        where: settingFilter,
        include: [{
            model: ExamScore,
            as: 'scores',
            include: [{
                model: Student,
                as: 'student',
                attributes: ['id', 'student_id', 'full_name'],
            }, {
                model: User,
                as: 'grader',
                attributes: ['id', 'full_name'],
            }],
        }],
        order: [
            ['exam_type', 'ASC'],
            ['component', 'ASC'],
        ],
    });

    // Get students for this course (optionally filtered by section)
    let studentFilter = {};
    if (section_id) {
        const sectionStudentIds = await CourseSectionStudent.findAll({
            where: { course_section_id: section_id },
            attributes: ['student_id'],
        });
        studentFilter.id = { [Op.in]: sectionStudentIds.map(s => s.student_id) };
    } else {
        // Get all students in course
        const sections = await CourseSection.findAll({
            where: { course_id: courseId },
            attributes: ['id'],
        });
        const sectionIds = sections.map(s => s.id);
        const sectionStudentIds = await CourseSectionStudent.findAll({
            where: { course_section_id: { [Op.in]: sectionIds } },
            attributes: ['student_id'],
        });
        studentFilter.id = { [Op.in]: [...new Set(sectionStudentIds.map(s => s.student_id))] };
    }

    const students = await Student.findAll({
        where: studentFilter,
        attributes: ['id', 'student_id', 'full_name'],
        order: [['student_id', 'ASC']],
    });

    res.json({
        success: true,
        data: {
            settings: examSettings,
            students: students,
        },
    });
});

/**
 * Save individual exam score
 * POST /courses/:courseId/exam-scores
 */
exports.saveExamScore = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { exam_setting_id, student_id, score, comment } = req.body;

    await ensureCourseActive(courseId);

    // Validate exam setting belongs to course
    const setting = await ExamSetting.findOne({
        where: { id: exam_setting_id, course_id: courseId, is_active: true },
    });

    if (!setting) {
        throw new ApiError(404, 'ไม่พบการตั้งค่าการสอบหรือยังไม่เปิดใช้งาน');
    }

    // Validate score
    if (score !== null && score !== undefined) {
        if (score < 0) {
            throw new ApiError(400, 'คะแนนต้องไม่ติดลบ');
        }
        if (parseFloat(setting.max_score) > 0 && score > parseFloat(setting.max_score)) {
            throw new ApiError(400, `คะแนนต้องไม่เกิน ${setting.max_score}`);
        }
    }

    // Upsert score
    const [examScore, created] = await ExamScore.upsert({
        exam_setting_id,
        student_id,
        score: score !== undefined ? score : null,
        comment: comment || null,
        graded_by: req.user.id,
        graded_at: new Date(),
    }, {
        returning: true,
    });

    // Fetch with associations
    const result = await ExamScore.findOne({
        where: { exam_setting_id, student_id },
        include: [{
            model: Student,
            as: 'student',
            attributes: ['id', 'student_id', 'full_name'],
        }, {
            model: User,
            as: 'grader',
            attributes: ['id', 'full_name'],
        }],
    });

    res.json({ success: true, data: result });
});

/**
 * Bulk save exam scores (from Excel paste)
 * POST /courses/:courseId/exam-scores/bulk
 */
exports.bulkSaveExamScores = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { exam_setting_id, scores } = req.body;

    await ensureCourseActive(courseId);

    // Validate exam setting
    const setting = await ExamSetting.findOne({
        where: { id: exam_setting_id, course_id: courseId, is_active: true },
    });

    if (!setting) {
        throw new ApiError(404, 'ไม่พบการตั้งค่าการสอบหรือยังไม่เปิดใช้งาน');
    }

    // Validate scores array
    if (!Array.isArray(scores) || scores.length === 0) {
        throw new ApiError(400, 'กรุณาระบุข้อมูลคะแนน');
    }

    // Get all students in course for validation
    const sections = await CourseSection.findAll({
        where: { course_id: courseId },
        attributes: ['id'],
    });
    const sectionIds = sections.map(s => s.id);
    const sectionStudents = await CourseSectionStudent.findAll({
        where: { course_section_id: { [Op.in]: sectionIds } },
        attributes: ['student_id'],
    });
    const validStudentIds = new Set(sectionStudents.map(s => s.student_id));

    // Build student_id lookup map
    const studentIdPairs = scores.map(s => s.student_id);
    const students = await Student.findAll({
        where: { student_id: { [Op.in]: studentIdPairs } },
        attributes: ['id', 'student_id'],
    });
    const studentMap = {};
    students.forEach(s => {
        studentMap[s.student_id] = s.id;
    });

    const results = {
        success: [],
        errors: [],
    };

    const transaction = await sequelize.transaction();
    try {
        for (const item of scores) {
            const { student_id: studentIdStr, score } = item;

            // Find internal student id
            const internalId = studentMap[studentIdStr];
            if (!internalId) {
                results.errors.push({
                    student_id: studentIdStr,
                    error: 'ไม่พบนักศึกษา',
                });
                continue;
            }

            // Check if student is in course
            if (!validStudentIds.has(internalId)) {
                results.errors.push({
                    student_id: studentIdStr,
                    error: 'นักศึกษาไม่ได้ลงทะเบียนในรายวิชานี้',
                });
                continue;
            }

            // Validate score
            const parsedScore = score === '' || score === null || score === undefined ? null : parseFloat(score);
            if (parsedScore !== null) {
                if (isNaN(parsedScore)) {
                    results.errors.push({
                        student_id: studentIdStr,
                        error: 'คะแนนไม่ถูกต้อง',
                    });
                    continue;
                }
                if (parsedScore < 0) {
                    results.errors.push({
                        student_id: studentIdStr,
                        error: 'คะแนนต้องไม่ติดลบ',
                    });
                    continue;
                }
                if (parseFloat(setting.max_score) > 0 && parsedScore > parseFloat(setting.max_score)) {
                    results.errors.push({
                        student_id: studentIdStr,
                        error: `คะแนนต้องไม่เกิน ${setting.max_score}`,
                    });
                    continue;
                }
            }

            // Upsert score
            await ExamScore.upsert({
                exam_setting_id,
                student_id: internalId,
                score: parsedScore,
                graded_by: req.user.id,
                graded_at: new Date(),
            }, { transaction });

            results.success.push({
                student_id: studentIdStr,
                score: parsedScore,
            });
        }

        await transaction.commit();

        // Log activity
        await logCourseActivity(courseId, req.user.id, 'bulk_update', 'exam_score', setting.id, {
            exam_type: setting.exam_type,
            component: setting.component,
            count: results.success.length,
        });

        res.json({
            success: true,
            data: {
                message: `บันทึกคะแนนสำเร็จ ${results.success.length}/${scores.length} รายการ`,
                ...results,
            },
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Delete exam score
 * DELETE /courses/:courseId/exam-scores/:scoreId
 */
exports.deleteExamScore = asyncHandler(async (req, res) => {
    const { courseId, scoreId } = req.params;

    await ensureCourseActive(courseId);

    const examScore = await ExamScore.findOne({
        where: { id: scoreId },
        include: [{
            model: ExamSetting,
            as: 'examSetting',
            where: { course_id: courseId },
        }],
    });

    if (!examScore) {
        throw new ApiError(404, 'ไม่พบคะแนนสอบ');
    }

    await examScore.destroy();

    res.json({ success: true, message: 'ลบคะแนนสอบสำเร็จ' });
});

/**
 * Get exam score statistics
 * GET /courses/:courseId/exam-scores/stats
 */
exports.getExamScoreStats = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const settings = await ExamSetting.findAll({
        where: { course_id: courseId, is_active: true },
        include: [{
            model: ExamScore,
            as: 'scores',
            attributes: ['score'],
        }],
    });

    const stats = settings.map(setting => {
        const scores = setting.scores.filter(s => s.score !== null).map(s => parseFloat(s.score));
        const count = scores.length;
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = count > 0 ? sum / count : 0;
        const max = count > 0 ? Math.max(...scores) : 0;
        const min = count > 0 ? Math.min(...scores) : 0;

        return {
            id: setting.id,
            exam_type: setting.exam_type,
            component: setting.component,
            max_score: setting.max_score,
            is_visible: setting.is_visible,
            stats: {
                count,
                avg: Math.round(avg * 100) / 100,
                max,
                min,
            },
        };
    });

    res.json({ success: true, data: stats });
});
