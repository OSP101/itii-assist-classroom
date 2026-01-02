const { Score, Assignment, AssignmentSubItem, Student, User, StudentGroup, StudentGroupMember, CourseSectionStudent, CourseSection, ScoreEditRequest, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get scores for an assignment
 */
const getScores = asyncHandler(async (req, res) => {
    const { assignment_id, course_id } = req.query;

    if (!assignment_id) {
        throw new ApiError(400, 'assignment_id is required');
    }

    const assignment = await Assignment.findByPk(assignment_id, {
        include: [
            {
                model: AssignmentSubItem,
                as: 'subItems',
                order: [['order_index', 'ASC']],
            },
        ],
    });

    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    // Get all students in the course
    const sections = await CourseSection.findAll({
        where: { course_id: assignment.course_id },
        include: [
            {
                model: Student,
                as: 'students',
                through: { attributes: [] },
            },
        ],
    });

    const allStudents = sections.flatMap(section => section.students);
    const uniqueStudents = [...new Map(allStudents.map(s => [s.id, s])).values()];

    // Get existing scores (including sub-item scores)
    const scores = await Score.findAll({
        where: { assignment_id },
        include: [
            {
                model: Student,
                as: 'student',
                attributes: ['id', 'student_id', 'full_name'],
            },
            {
                model: User,
                as: 'grader',
                attributes: ['id', 'full_name'],
            },
        ],
    });

    // Build score map by student_id (for main scores - sub_item_id is null)
    const scoreMap = {};
    // Build sub-item score map by student_id -> sub_item_id
    const subItemScoreMap = {};
    
    scores.forEach(score => {
        if (score.sub_item_id) {
            // This is a sub-item score
            if (!subItemScoreMap[score.student_id]) {
                subItemScoreMap[score.student_id] = {};
            }
            subItemScoreMap[score.student_id][score.sub_item_id] = score;
        } else {
            // This is a main score
            scoreMap[score.student_id] = score;
        }
    });

    // Build response with all students
    const studentScores = uniqueStudents.map(student => {
        const existingScore = scoreMap[student.id];
        const studentSubItemScores = subItemScoreMap[student.id] || {};
        
        // Build sub-item scores array
        const subItemScores = assignment.subItems ? assignment.subItems.map(subItem => {
            const subScore = studentSubItemScores[subItem.id];
            return {
                sub_item_id: subItem.id,
                sub_item_name: subItem.name,
                max_score: subItem.max_score,
                score: subScore ? parseFloat(subScore.score) : null,
                score_id: subScore ? subScore.id : null,
                graded_by: subScore && subScore.grader ? {
                    id: subScore.grader.id,
                    display_name: subScore.grader.full_name,
                } : null,
                graded_at: subScore ? subScore.graded_at : null,
            };
        }) : [];
        
        return {
            student,
            score: existingScore ? existingScore.score : null,
            score_id: existingScore ? existingScore.id : null,
            max_score: assignment.max_score,
            comment: existingScore ? existingScore.comment : null,
            status: existingScore ? existingScore.status : 'pending',
            graded_by: existingScore && existingScore.grader ? {
                id: existingScore.grader.id,
                display_name: existingScore.grader.full_name,
            } : null,
            graded_at: existingScore ? existingScore.graded_at : null,
            sub_item_scores: subItemScores,
        };
    });

    res.json({
        success: true,
        data: {
            assignment,
            student_scores: studentScores,
        },
    });
});

/**
 * Submit/Update a single score (with optional sub_item_id)
 */
const submitScore = asyncHandler(async (req, res) => {
    const { assignment_id, student_id, score, comment, sub_item_id } = req.body;

    if (!assignment_id || !student_id || score === undefined) {
        throw new ApiError(400, 'assignment_id, student_id and score are required');
    }

    const assignment = await Assignment.findByPk(assignment_id, {
        include: [{
            model: AssignmentSubItem,
            as: 'subItems',
        }],
    });
    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    // Validate score against max
    let maxScore = parseFloat(assignment.max_score);
    
    // If sub_item_id is provided, validate against sub-item max
    if (sub_item_id) {
        const subItem = assignment.subItems?.find(si => si.id === sub_item_id);
        if (!subItem) {
            throw new ApiError(404, 'Sub-item not found');
        }
        maxScore = parseFloat(subItem.max_score);
    }

    if (score < 0 || score > maxScore) {
        throw new ApiError(400, `Score must be between 0 and ${maxScore}`);
    }

    // Build where clause
    const whereClause = {
        assignment_id,
        student_id,
    };
    
    // Handle sub_item_id (null vs specific value)
    if (sub_item_id) {
        whereClause.sub_item_id = sub_item_id;
    } else {
        whereClause.sub_item_id = null;
    }

    // Find existing score or create new
    const [scoreRecord, created] = await Score.findOrCreate({
        where: whereClause,
        defaults: {
            score,
            comment,
            sub_item_id: sub_item_id || null,
            graded_by: req.user.id,
            graded_at: new Date(),
            status: 'graded',
        },
    });

    if (!created) {
        // Update existing score
        await scoreRecord.update({
            score,
            comment: comment !== undefined ? comment : scoreRecord.comment,
            graded_by: req.user.id,
            graded_at: new Date(),
            status: 'graded',
        });
    }

    res.json({
        success: true,
        data: scoreRecord,
        message: created ? 'Score submitted successfully' : 'Score updated successfully',
    });
});

/**
 * Submit bulk scores
 */
const submitBulkScores = asyncHandler(async (req, res) => {
    const { assignment_id, scores } = req.body;

    if (!assignment_id || !scores || !Array.isArray(scores)) {
        throw new ApiError(400, 'assignment_id and scores array are required');
    }

    const assignment = await Assignment.findByPk(assignment_id);
    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    const transaction = await sequelize.transaction();
    const results = { created: 0, updated: 0 };

    try {
        for (const item of scores) {
            const { student_id, score, comment } = item;

            if (student_id === undefined || score === undefined) continue;

            const [scoreRecord, created] = await Score.findOrCreate({
                where: {
                    assignment_id,
                    student_id,
                },
                defaults: {
                    score,
                    comment,
                    graded_by: req.user.id,
                    graded_at: new Date(),
                    status: 'graded',
                },
                transaction,
            });

            if (!created) {
                await scoreRecord.update({
                    score,
                    comment: comment !== undefined ? comment : scoreRecord.comment,
                    graded_by: req.user.id,
                    graded_at: new Date(),
                    status: 'graded',
                }, { transaction });
                results.updated++;
            } else {
                results.created++;
            }
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `${results.created} scores created, ${results.updated} scores updated`,
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Submit group score (applies to all members, with optional sub_item_id)
 */
const submitGroupScore = asyncHandler(async (req, res) => {
    const { assignment_id, group_id, score, comment, sub_item_id } = req.body;

    if (!assignment_id || !group_id || score === undefined) {
        throw new ApiError(400, 'assignment_id, group_id and score are required');
    }

    // Validate assignment and sub-item if provided
    const assignment = await Assignment.findByPk(assignment_id, {
        include: [{
            model: AssignmentSubItem,
            as: 'subItems',
        }],
    });
    
    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    let maxScore = parseFloat(assignment.max_score);
    if (sub_item_id) {
        const subItem = assignment.subItems?.find(si => si.id === sub_item_id);
        if (!subItem) {
            throw new ApiError(404, 'Sub-item not found');
        }
        maxScore = parseFloat(subItem.max_score);
    }

    if (score < 0 || score > maxScore) {
        throw new ApiError(400, `Score must be between 0 and ${maxScore}`);
    }

    // Get group members
    const groupMembers = await StudentGroupMember.findAll({
        where: { group_id },
        attributes: ['student_id'],
    });

    if (groupMembers.length === 0) {
        throw new ApiError(404, 'No members found in this group');
    }

    const transaction = await sequelize.transaction();

    try {
        for (const member of groupMembers) {
            // Build where clause for finding existing score
            const whereClause = {
                assignment_id,
                student_id: member.student_id,
            };
            if (sub_item_id) {
                whereClause.sub_item_id = sub_item_id;
            } else {
                whereClause.sub_item_id = null;
            }

            const [scoreRecord, created] = await Score.findOrCreate({
                where: whereClause,
                defaults: {
                    assignment_id,
                    student_id: member.student_id,
                    group_id,
                    sub_item_id: sub_item_id || null,
                    score,
                    comment,
                    graded_by: req.user.id,
                    graded_at: new Date(),
                    status: 'graded',
                },
                transaction,
            });

            if (!created) {
                await scoreRecord.update({
                    score,
                    comment: comment !== undefined ? comment : scoreRecord.comment,
                    graded_by: req.user.id,
                    graded_at: new Date(),
                    status: 'graded',
                }, { transaction });
            }
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `Score submitted for ${groupMembers.length} group members`,
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Request score edit (for TA)
 */
const requestScoreEdit = asyncHandler(async (req, res) => {
    const { score_id, new_score, reason } = req.body;

    if (!score_id || new_score === undefined || !reason) {
        throw new ApiError(400, 'score_id, new_score and reason are required');
    }

    const existingScore = await Score.findByPk(score_id);
    if (!existingScore) {
        throw new ApiError(404, 'Score not found');
    }

    // Check if there's a pending request already
    const pendingRequest = await ScoreEditRequest.findOne({
        where: {
            score_id,
            status: 'pending',
        },
    });

    if (pendingRequest) {
        throw new ApiError(400, 'There is already a pending edit request for this score');
    }

    const editRequest = await ScoreEditRequest.create({
        score_id,
        old_score: existingScore.score,
        new_score,
        reason,
        requested_by: req.user.id,
    });

    res.status(201).json({
        success: true,
        data: editRequest,
        message: 'Score edit request submitted for approval',
    });
});

/**
 * Get pending edit requests (for Instructor)
 */
const getPendingEditRequests = asyncHandler(async (req, res) => {
    const { course_id } = req.query;

    const whereClause = { status: 'pending' };

    const requests = await ScoreEditRequest.findAll({
        where: whereClause,
        include: [
            {
                model: Score,
                as: 'score',
                include: [
                    {
                        model: Assignment,
                        as: 'assignment',
                        where: course_id ? { course_id } : {},
                    },
                    {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'student_id', 'full_name'],
                    },
                ],
            },
            {
                model: User,
                as: 'requester',
                attributes: ['id', 'full_name'],
            },
        ],
        order: [['created_at', 'DESC']],
    });

    // Transform to include display_name
    const transformedRequests = requests.map(req => {
        const data = req.toJSON();
        if (data.requester) {
            data.requester = {
                id: data.requester.id,
                display_name: data.requester.full_name,
            };
        }
        return data;
    });

    res.json({
        success: true,
        data: transformedRequests,
    });
});

/**
 * Review edit request (approve/reject)
 */
const reviewEditRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, review_comment } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        throw new ApiError(400, 'status must be either "approved" or "rejected"');
    }

    const editRequest = await ScoreEditRequest.findByPk(id, {
        include: [{ model: Score, as: 'score' }],
    });

    if (!editRequest) {
        throw new ApiError(404, 'Edit request not found');
    }

    if (editRequest.status !== 'pending') {
        throw new ApiError(400, 'This request has already been reviewed');
    }

    const transaction = await sequelize.transaction();

    try {
        // Update request status
        await editRequest.update({
            status,
            reviewed_by: req.user.id,
            reviewed_at: new Date(),
            review_comment,
        }, { transaction });

        // If approved, update the actual score
        if (status === 'approved') {
            await editRequest.score.update({
                score: editRequest.new_score,
                graded_by: req.user.id,
                graded_at: new Date(),
            }, { transaction });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: status === 'approved' 
                ? 'Score edit approved and applied' 
                : 'Score edit request rejected',
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Get student scores summary for a course
 */
const getStudentScoresSummary = asyncHandler(async (req, res) => {
    const { course_id, student_id } = req.query;

    if (!course_id) {
        throw new ApiError(400, 'course_id is required');
    }

    const whereClause = { course_id, is_active: true };
    
    const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
            {
                model: AssignmentSubItem,
                as: 'subItems',
            },
            {
                model: Score,
                as: 'scores',
                where: student_id ? { student_id } : {},
                required: false,
                include: [
                    {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'student_id', 'full_name'],
                    },
                ],
            },
        ],
        order: [['order_index', 'ASC']],
    });

    res.json({
        success: true,
        data: assignments,
    });
});

/**
 * Search students for autocomplete
 */
const searchStudents = asyncHandler(async (req, res) => {
    const { course_id, query } = req.query;

    if (!course_id) {
        throw new ApiError(400, 'course_id is required');
    }

    // Get students in this course
    const sections = await CourseSection.findAll({
        where: { course_id },
        include: [
            {
                model: Student,
                as: 'students',
                through: { attributes: [] },
                where: query ? {
                    [Op.or]: [
                        { student_id: { [Op.like]: `%${query}%` } },
                        { full_name: { [Op.like]: `%${query}%` } },
                    ],
                } : {},
            },
        ],
    });

    const allStudents = sections.flatMap(section => section.students);
    const uniqueStudents = [...new Map(allStudents.map(s => [s.id, s])).values()];

    res.json({
        success: true,
        data: uniqueStudents.slice(0, 20), // Limit to 20 results
    });
});

/**
 * Get groups for assignment scoring
 */
const getGroupsForAssignment = asyncHandler(async (req, res) => {
    const { assignment_id } = req.query;

    if (!assignment_id) {
        throw new ApiError(400, 'assignment_id is required');
    }

    const assignment = await Assignment.findByPk(assignment_id);
    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    let groups;
    if (assignment.assignment_type === 'permanent_group') {
        groups = await StudentGroup.findAll({
            where: {
                course_id: assignment.course_id,
                group_type: 'permanent',
            },
            include: [
                {
                    model: Student,
                    as: 'members',
                    through: { attributes: [] },
                },
            ],
        });
    } else if (assignment.assignment_type === 'weekly_group') {
        groups = await StudentGroup.findAll({
            where: {
                course_id: assignment.course_id,
                group_type: 'temporary',
                week_number: assignment.week_number,
            },
            include: [
                {
                    model: Student,
                    as: 'members',
                    through: { attributes: [] },
                },
            ],
        });
    } else {
        groups = [];
    }

    res.json({
        success: true,
        data: groups,
    });
});

module.exports = {
    getScores,
    submitScore,
    submitBulkScores,
    submitGroupScore,
    requestScoreEdit,
    getPendingEditRequests,
    reviewEditRequest,
    getStudentScoresSummary,
    searchStudents,
    getGroupsForAssignment,
};
