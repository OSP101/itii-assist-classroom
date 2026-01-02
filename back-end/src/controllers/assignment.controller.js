const { Assignment, AssignmentSubItem, Score, Course, Student, User, StudentGroup, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get all assignments for a course
 */
const getAssignments = asyncHandler(async (req, res) => {
    const { course_id } = req.query;

    if (!course_id) {
        throw new ApiError(400, 'course_id is required');
    }

    const assignments = await Assignment.findAll({
        where: { 
            course_id,
            is_active: true 
        },
        include: [
            {
                model: AssignmentSubItem,
                as: 'subItems',
                order: [['order_index', 'ASC']],
            },
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'full_name'],
            },
        ],
        order: [['order_index', 'ASC'], ['created_at', 'DESC']],
    });

    res.json({
        success: true,
        data: assignments,
    });
});

/**
 * Get single assignment with details
 */
const getAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignment = await Assignment.findByPk(id, {
        include: [
            {
                model: AssignmentSubItem,
                as: 'subItems',
                order: [['order_index', 'ASC']],
            },
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'full_name'],
            },
        ],
    });

    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    res.json({
        success: true,
        data: assignment,
    });
});

/**
 * Create new assignment
 */
const createAssignment = asyncHandler(async (req, res) => {
    const { 
        course_id, 
        name, 
        description, 
        assignment_type, 
        week_number,
        max_score, 
        sub_items,
        due_date 
    } = req.body;

    if (!course_id || !name) {
        throw new ApiError(400, 'course_id and name are required');
    }

    // Get max order_index for this course
    const maxOrder = await Assignment.max('order_index', {
        where: { course_id },
    }) || 0;

    const transaction = await sequelize.transaction();

    try {
        // Create assignment
        const assignment = await Assignment.create({
            course_id,
            name,
            description,
            assignment_type: assignment_type || 'individual',
            week_number,
            max_score: max_score || 10,
            due_date,
            order_index: maxOrder + 1,
            created_by: req.user.id,
        }, { transaction });

        // Create sub-items if any
        if (sub_items && sub_items.length > 0) {
            const subItemsData = sub_items.map((item, index) => ({
                assignment_id: assignment.id,
                name: item.name,
                max_score: item.max_score || 10,
                order_index: index,
            }));

            await AssignmentSubItem.bulkCreate(subItemsData, { transaction });

            // Update assignment max_score to sum of sub-items
            const totalScore = sub_items.reduce((sum, item) => sum + (item.max_score || 10), 0);
            await assignment.update({ max_score: totalScore }, { transaction });
        }

        await transaction.commit();

        // Fetch complete assignment with sub-items
        const completeAssignment = await Assignment.findByPk(assignment.id, {
            include: [
                {
                    model: AssignmentSubItem,
                    as: 'subItems',
                    order: [['order_index', 'ASC']],
                },
            ],
        });

        res.status(201).json({
            success: true,
            data: completeAssignment,
            message: 'Assignment created successfully',
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Update assignment
 */
const updateAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        description, 
        assignment_type,
        week_number, 
        max_score, 
        sub_items,
        due_date 
    } = req.body;

    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    const transaction = await sequelize.transaction();

    try {
        // Update assignment
        await assignment.update({
            name: name || assignment.name,
            description: description !== undefined ? description : assignment.description,
            assignment_type: assignment_type || assignment.assignment_type,
            week_number: week_number !== undefined ? week_number : assignment.week_number,
            max_score: max_score !== undefined ? max_score : assignment.max_score,
            due_date: due_date !== undefined ? due_date : assignment.due_date,
        }, { transaction });

        // Handle sub-items update if provided
        if (sub_items !== undefined) {
            // Delete existing sub-items
            await AssignmentSubItem.destroy({
                where: { assignment_id: id },
                transaction,
            });

            // Create new sub-items
            if (sub_items && sub_items.length > 0) {
                const subItemsData = sub_items.map((item, index) => ({
                    assignment_id: id,
                    name: item.name,
                    max_score: item.max_score || 10,
                    order_index: index,
                }));

                await AssignmentSubItem.bulkCreate(subItemsData, { transaction });

                // Update max_score to sum of sub-items
                const totalScore = sub_items.reduce((sum, item) => sum + (item.max_score || 10), 0);
                await assignment.update({ max_score: totalScore }, { transaction });
            }
        }

        await transaction.commit();

        // Fetch updated assignment
        const updatedAssignment = await Assignment.findByPk(id, {
            include: [
                {
                    model: AssignmentSubItem,
                    as: 'subItems',
                    order: [['order_index', 'ASC']],
                },
            ],
        });

        res.json({
            success: true,
            data: updatedAssignment,
            message: 'Assignment updated successfully',
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * Delete assignment (soft delete)
 */
const deleteAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
        throw new ApiError(404, 'Assignment not found');
    }

    // Soft delete by setting is_active to false
    await assignment.update({ is_active: false });

    res.json({
        success: true,
        message: 'Assignment deleted successfully',
    });
});

/**
 * Reorder assignments
 */
const reorderAssignments = asyncHandler(async (req, res) => {
    const { assignments } = req.body; // Array of { id, order_index }

    if (!assignments || !Array.isArray(assignments)) {
        throw new ApiError(400, 'assignments array is required');
    }

    const transaction = await sequelize.transaction();

    try {
        for (const item of assignments) {
            await Assignment.update(
                { order_index: item.order_index },
                { where: { id: item.id }, transaction }
            );
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Assignments reordered successfully',
        });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

module.exports = {
    getAssignments,
    getAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    reorderAssignments,
};
