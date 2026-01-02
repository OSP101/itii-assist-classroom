const { ScoreEditRequest, Score, Assignment, AssignmentSubItem, Student, User, Course, CourseSection, CourseSectionStudent, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get all score edit requests for a course (instructor only)
 */
const getEditRequests = asyncHandler(async (req, res) => {
    const { course_id, status } = req.query;
    const userId = req.user.id;

    console.log('[ScoreEditRequest] getEditRequests - course_id:', course_id, 'status:', status, 'userId:', userId);

    if (!course_id) {
        throw new ApiError(400, 'course_id is required');
    }

    // Verify user is instructor of this course
    const course = await Course.findByPk(course_id);
    if (!course) {
        throw new ApiError(404, 'Course not found');
    }

    console.log('[ScoreEditRequest] course.instructor_id:', course.instructor_id, 'userId:', userId);

    if (String(course.instructor_id) !== String(userId)) {
        throw new ApiError(403, 'Only instructor can view edit requests');
    }

    // Build where clause
    const whereClause = {};
    if (status) {
        whereClause.status = status;
    }

    // Get all edit requests for assignments in this course
    const editRequests = await ScoreEditRequest.findAll({
        where: whereClause,
        include: [
            {
                model: Score,
                as: 'score',
                required: true,
                include: [
                    {
                        model: Assignment,
                        as: 'assignment',
                        where: { course_id },
                        include: [
                            {
                                model: AssignmentSubItem,
                                as: 'subItems',
                            }
                        ]
                    },
                    {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'student_id', 'full_name'],
                    },
                    {
                        model: AssignmentSubItem,
                        as: 'subItem',
                        attributes: ['id', 'name', 'max_score'],
                    },
                ],
            },
            {
                model: User,
                as: 'requester',
                attributes: ['id', 'username', 'full_name'],
            },
            {
                model: User,
                as: 'reviewer',
                attributes: ['id', 'username', 'full_name'],
            },
        ],
        order: [['created_at', 'DESC']],
    });

    // Format response
    const formatted = editRequests.map(req => ({
        id: req.id,
        status: req.status,
        old_score: req.old_score ? parseFloat(req.old_score) : null,
        new_score: parseFloat(req.new_score),
        reason: req.reason,
        review_comment: req.review_comment,
        created_at: req.created_at,
        reviewed_at: req.reviewed_at,
        score: {
            id: req.score.id,
            current_score: req.score.score ? parseFloat(req.score.score) : null,
        },
        assignment: {
            id: req.score.assignment.id,
            name: req.score.assignment.name,
            max_score: parseFloat(req.score.assignment.max_score),
        },
        sub_item: req.score.subItem ? {
            id: req.score.subItem.id,
            name: req.score.subItem.name,
            max_score: parseFloat(req.score.subItem.max_score),
        } : null,
        student: {
            id: req.score.student.id,
            student_id: req.score.student.student_id,
            full_name: req.score.student.full_name,
        },
        requester: {
            id: req.requester.id,
            username: req.requester.username,
            full_name: req.requester.full_name,
        },
        reviewer: req.reviewer ? {
            id: req.reviewer.id,
            username: req.reviewer.username,
            full_name: req.reviewer.full_name,
        } : null,
    }));

    // Count by status
    const pendingCount = await ScoreEditRequest.count({
        include: [{
            model: Score,
            as: 'score',
            required: true,
            include: [{
                model: Assignment,
                as: 'assignment',
                where: { course_id },
            }]
        }],
        where: { status: 'pending' },
    });

    const approvedCount = await ScoreEditRequest.count({
        include: [{
            model: Score,
            as: 'score',
            required: true,
            include: [{
                model: Assignment,
                as: 'assignment',
                where: { course_id },
            }]
        }],
        where: { status: 'approved' },
    });

    const rejectedCount = await ScoreEditRequest.count({
        include: [{
            model: Score,
            as: 'score',
            required: true,
            include: [{
                model: Assignment,
                as: 'assignment',
                where: { course_id },
            }]
        }],
        where: { status: 'rejected' },
    });

    res.json({
        success: true,
        data: formatted,
        counts: {
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
        },
    });
});

/**
 * Get pending count for a course (for badge)
 */
const getPendingCount = asyncHandler(async (req, res) => {
    const { course_id } = req.query;
    const userId = req.user.id;

    if (!course_id) {
        throw new ApiError(400, 'course_id is required');
    }

    // Verify user is instructor of this course
    const course = await Course.findByPk(course_id);
    if (!course) {
        throw new ApiError(404, 'Course not found');
    }

    if (course.instructor_id !== userId) {
        throw new ApiError(403, 'Only instructor can view pending count');
    }

    const count = await ScoreEditRequest.count({
        include: [{
            model: Score,
            as: 'score',
            required: true,
            include: [{
                model: Assignment,
                as: 'assignment',
                where: { course_id },
            }]
        }],
        where: { status: 'pending' },
    });

    res.json({
        success: true,
        count,
    });
});

/**
 * Create a score edit request (TA only)
 */
const createEditRequest = asyncHandler(async (req, res) => {
    const { score_id, new_score, reason } = req.body;
    const userId = req.user.id;

    if (!score_id || new_score === undefined) {
        throw new ApiError(400, 'score_id and new_score are required');
    }

    // Get the score with assignment info
    const score = await Score.findByPk(score_id, {
        include: [
            {
                model: Assignment,
                as: 'assignment',
                include: [{ model: Course, as: 'course' }],
            },
            {
                model: AssignmentSubItem,
                as: 'subItem',
            },
        ],
    });

    if (!score) {
        throw new ApiError(404, 'Score not found');
    }

    // Validate new_score
    const maxScore = score.subItem ? score.subItem.max_score : score.assignment.max_score;
    if (new_score < 0 || new_score > maxScore) {
        throw new ApiError(400, `Score must be between 0 and ${maxScore}`);
    }

    // Check if there's already a pending request for this score
    const existingRequest = await ScoreEditRequest.findOne({
        where: {
            score_id,
            status: 'pending',
        },
    });

    if (existingRequest) {
        throw new ApiError(400, 'There is already a pending edit request for this score');
    }

    // Create edit request
    const editRequest = await ScoreEditRequest.create({
        score_id,
        old_score: score.score,
        new_score,
        reason: reason || null,
        status: 'pending',
        requested_by: userId,
    });

    res.status(201).json({
        success: true,
        message: 'Edit request created successfully',
        data: {
            id: editRequest.id,
            status: editRequest.status,
        },
    });
});

/**
 * Approve a score edit request (instructor only)
 */
const approveEditRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    const editRequest = await ScoreEditRequest.findByPk(id, {
        include: [
            {
                model: Score,
                as: 'score',
                include: [
                    {
                        model: Assignment,
                        as: 'assignment',
                        include: [{ model: Course, as: 'course' }],
                    },
                ],
            },
        ],
    });

    if (!editRequest) {
        throw new ApiError(404, 'Edit request not found');
    }

    // Verify user is instructor
    if (editRequest.score.assignment.course.instructor_id !== userId) {
        throw new ApiError(403, 'Only instructor can approve edit requests');
    }

    if (editRequest.status !== 'pending') {
        throw new ApiError(400, 'This request has already been processed');
    }

    // Start transaction
    const t = await sequelize.transaction();

    try {
        // Update the score
        await Score.update(
            {
                score: editRequest.new_score,
                graded_at: new Date(),
            },
            {
                where: { id: editRequest.score_id },
                transaction: t,
            }
        );

        // Update the edit request
        await editRequest.update(
            {
                status: 'approved',
                reviewed_by: userId,
                reviewed_at: new Date(),
                review_comment: comment || null,
            },
            { transaction: t }
        );

        await t.commit();

        res.json({
            success: true,
            message: 'Score edit request approved',
        });
    } catch (error) {
        await t.rollback();
        throw error;
    }
});

/**
 * Reject a score edit request (instructor only)
 */
const rejectEditRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment) {
        throw new ApiError(400, 'Rejection reason is required');
    }

    const editRequest = await ScoreEditRequest.findByPk(id, {
        include: [
            {
                model: Score,
                as: 'score',
                include: [
                    {
                        model: Assignment,
                        as: 'assignment',
                        include: [{ model: Course, as: 'course' }],
                    },
                ],
            },
        ],
    });

    if (!editRequest) {
        throw new ApiError(404, 'Edit request not found');
    }

    // Verify user is instructor
    if (editRequest.score.assignment.course.instructor_id !== userId) {
        throw new ApiError(403, 'Only instructor can reject edit requests');
    }

    if (editRequest.status !== 'pending') {
        throw new ApiError(400, 'This request has already been processed');
    }

    // Update the edit request
    await editRequest.update({
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_comment: comment,
    });

    res.json({
        success: true,
        message: 'Score edit request rejected',
    });
});

module.exports = {
    getEditRequests,
    getPendingCount,
    createEditRequest,
    approveEditRequest,
    rejectEditRequest,
};
