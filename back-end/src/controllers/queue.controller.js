/**
 * Queue Controller
 * ระบบจองคิวตรวจงาน
 */

const { Op } = require('sequelize');
const {
    QueueSession,
    QueueWorker,
    QueueBooking,
    QueueDeskStatus,
    Course,
    Classroom,
    Desk,
    Assignment,
    AssignmentSubItem,
    AttendanceSession,
    AttendanceRecord,
    Student,
    User,
    Score,
    sequelize,
} = require('../models');
const logger = require('../utils/logger');

// ============================================
// Queue Session Management (Instructor/TA)
// ============================================

/**
 * Get all queue sessions for a course
 */
const getQueueSessions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { status } = req.query;

        const where = { course_id: courseId };
        if (status) {
            where.status = status;
        }

        const sessions = await QueueSession.findAll({
            where,
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'building', 'floor'],
                },
                {
                    model: Assignment,
                    as: 'linkedAssignment',
                    attributes: ['id', 'name', 'max_score'],
                },
                {
                    model: AttendanceSession,
                    as: 'linkedAttendanceSession',
                    attributes: ['id', 'title'],
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name'],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        // ✅ OPTIMIZED: Get statistics for ALL sessions in a single batch query
        const sessionIds = sessions.map(s => s.id);
        
        const allStats = sessionIds.length > 0 ? await QueueBooking.findAll({
            where: { queue_session_id: { [Op.in]: sessionIds } },
            attributes: [
                'queue_session_id',
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['queue_session_id', 'status'],
            raw: true,
        }) : [];

        // Build stats map: session_id -> { waiting, in_progress, completed, total }
        const statsMap = {};
        sessionIds.forEach(id => {
            statsMap[id] = { total: 0, waiting: 0, in_progress: 0, completed: 0 };
        });
        allStats.forEach(row => {
            const sessionId = row.queue_session_id;
            const status = row.status;
            const count = parseInt(row.count);
            if (statsMap[sessionId]) {
                statsMap[sessionId][status] = count;
                statsMap[sessionId].total += count;
            }
        });

        // Map sessions with stats (no additional queries)
        const sessionsWithStats = sessions.map(session => ({
            ...session.toJSON(),
            stats: statsMap[session.id] || { total: 0, waiting: 0, in_progress: 0, completed: 0 },
        }));

        res.json({
            success: true,
            data: sessionsWithStats,
        });
    } catch (error) {
        console.error('Error getting queue sessions:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Get single queue session details
 */
const getQueueSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QueueSession.findByPk(sessionId, {
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    include: [
                        {
                            model: Desk,
                            as: 'desks',
                            where: { is_enabled: true },
                            required: false,
                            order: [['number', 'ASC']],
                        },
                    ],
                },
                {
                    model: Assignment,
                    as: 'linkedAssignment',
                    include: [
                        {
                            model: AssignmentSubItem,
                            as: 'subItems',
                        },
                    ],
                },
                {
                    model: AttendanceSession,
                    as: 'linkedAttendanceSession',
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name'],
                },
                {
                    model: QueueWorker,
                    as: 'workers',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'full_name', 'avatar'],
                        },
                    ],
                },
            ],
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        // Get desk statuses
        const deskStatuses = await QueueDeskStatus.findAll({
            where: { queue_session_id: sessionId },
            include: [
                {
                    model: Desk,
                    as: 'desk',
                },
            ],
        });

        // Get booking statistics
        const stats = await QueueBooking.findAll({
            where: { queue_session_id: sessionId },
            attributes: [
                'booking_type',
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['booking_type', 'status'],
            raw: true,
        });

        res.json({
            success: true,
            data: {
                ...session.toJSON(),
                deskStatuses,
                statistics: stats,
            },
        });
    } catch (error) {
        console.error('Error getting queue session:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Create new queue session
 */
const createQueueSession = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { courseId } = req.params;
        const {
            title,
            description,
            classroom_id,
            linked_assignment_id,
            require_attendance,
            linked_attendance_session_id,
        } = req.body;

        // Validate classroom exists
        const classroom = await Classroom.findByPk(classroom_id);
        if (!classroom) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบห้องเรียน' },
            });
        }

        // Generate PIN code
        const pin_code = QueueSession.generatePIN();

        // Create session
        const session = await QueueSession.create(
            {
                course_id: courseId,
                classroom_id,
                title,
                description,
                pin_code,
                linked_assignment_id: linked_assignment_id || null,
                require_attendance: require_attendance || false,
                linked_attendance_session_id: linked_attendance_session_id || null,
                status: 'draft',
                created_by: req.user.id,
            },
            { transaction }
        );

        // Initialize desk statuses
        const desks = await Desk.findAll({
            where: { classroom_id, is_enabled: true },
        });

        const deskStatusRecords = desks.map((desk) => ({
            queue_session_id: session.id,
            desk_id: desk.id,
            grading_status: 'not_started',
            help_status: 'none',
        }));

        await QueueDeskStatus.bulkCreate(deskStatusRecords, { transaction });

        await transaction.commit();

        // Fetch complete session
        const completeSession = await QueueSession.findByPk(session.id, {
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                },
                {
                    model: Assignment,
                    as: 'linkedAssignment',
                },
            ],
        });

        res.status(201).json({
            success: true,
            data: completeSession,
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating queue session:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Update queue session
 */
const updateQueueSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const updates = req.body;

        const session = await QueueSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        // Don't allow changing certain fields if session is active
        if (session.status === 'active') {
            delete updates.classroom_id;
            delete updates.course_id;
        }

        await session.update(updates);

        res.json({
            success: true,
            data: session,
        });
    } catch (error) {
        console.error('Error updating queue session:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Update queue session status
 */
const updateQueueSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status } = req.body;

        const session = await QueueSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        // Validate status transition
        const validTransitions = {
            draft: ['active'],
            active: ['paused', 'closed'],
            paused: ['active', 'closed'],
            closed: [],
        };

        if (!validTransitions[session.status].includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `ไม่สามารถเปลี่ยนสถานะจาก ${session.status} เป็น ${status}`,
                },
            });
        }

        // Set start_time when activating
        const updateData = { status };
        if (status === 'active' && !session.start_time) {
            updateData.start_time = new Date();
        }
        if (status === 'closed') {
            updateData.end_time = new Date();
        }

        await session.update(updateData);

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.to(`queue-${sessionId}`).emit('session-status-changed', {
                sessionId,
                status,
            });
        }

        res.json({
            success: true,
            data: session,
        });
    } catch (error) {
        console.error('Error updating queue session status:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Delete queue session
 */
const deleteQueueSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QueueSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        // Can only delete draft sessions
        if (session.status !== 'draft') {
            return res.status(400).json({
                success: false,
                error: { message: 'สามารถลบได้เฉพาะ Session ที่ยังไม่เปิดใช้งาน' },
            });
        }

        await session.destroy();

        res.json({
            success: true,
            message: 'ลบ Queue Session สำเร็จ',
        });
    } catch (error) {
        console.error('Error deleting queue session:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Regenerate PIN code
 */
const regeneratePIN = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QueueSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        const newPIN = QueueSession.generatePIN();
        await session.update({ pin_code: newPIN });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`queue-${sessionId}`).emit('pin-changed', {
                sessionId,
                pin_code: newPIN,
            });
        }

        res.json({
            success: true,
            data: { pin_code: newPIN },
        });
    } catch (error) {
        console.error('Error regenerating PIN:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

// ============================================
// Worker Management
// ============================================

/**
 * Join as worker
 */
const joinAsWorker = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { accept_grading, accept_help } = req.body;

        const session = await QueueSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        // Check if session is active
        if (session.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: { message: 'Session ยังไม่เปิดใช้งาน' },
            });
        }

        // Create or update worker record
        const [worker, created] = await QueueWorker.findOrCreate({
            where: {
                queue_session_id: sessionId,
                user_id: req.user.id,
            },
            defaults: {
                accept_grading: accept_grading !== false,
                accept_help: accept_help !== false,
                status: 'online',
                last_active_at: new Date(),
            },
        });

        if (!created) {
            await worker.update({
                accept_grading: accept_grading !== false,
                accept_help: accept_help !== false,
                status: 'online',
                last_active_at: new Date(),
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        let assignedBooking = null;
        
        if (io) {
            io.to(`queue-${sessionId}`).emit('worker-joined', {
                workerId: worker.id,
                userId: req.user.id,
                userName: req.user.full_name,
            });

            // Check for waiting bookings and try to assign one to this worker
            assignedBooking = await tryAssignWaitingBookingToWorker(sessionId, req.user.id, worker, io);
        }

        res.json({
            success: true,
            data: worker,
            assignedBooking: assignedBooking, // Include any immediately assigned booking
        });
    } catch (error) {
        console.error('Error joining as worker:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Leave as worker (go offline)
 */
const leaveAsWorker = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const worker = await QueueWorker.findOne({
            where: {
                queue_session_id: sessionId,
                user_id: req.user.id,
            },
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบข้อมูล Worker' },
            });
        }

        // Check if worker has active booking
        if (worker.current_booking_id) {
            return res.status(400).json({
                success: false,
                error: { message: 'กรุณาทำงานปัจจุบันให้เสร็จก่อน' },
            });
        }

        await worker.update({
            status: 'offline',
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`queue-${sessionId}`).emit('worker-left', {
                workerId: worker.id,
                userId: req.user.id,
            });
        }

        res.json({
            success: true,
            message: 'ออกจากการรับงานสำเร็จ',
        });
    } catch (error) {
        console.error('Error leaving as worker:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Get online workers
 */
const getWorkers = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const workers = await QueueWorker.findAll({
            where: { queue_session_id: sessionId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'avatar', 'role'],
                },
            ],
            order: [['status', 'ASC'], ['last_active_at', 'DESC']],
        });

        res.json({
            success: true,
            data: workers,
        });
    } catch (error) {
        console.error('Error getting workers:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

// ============================================
// Booking Management (Student)
// ============================================

/**
 * Create booking (Student)
 */
const createBooking = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { pin_code, student_id, desk_number, booking_type, note } = req.body;

        // Find session by PIN
        const session = await QueueSession.findOne({
            where: { pin_code, status: 'active' },
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    include: [{ model: Desk, as: 'desks' }],
                },
            ],
        });

        if (!session) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบการจองคิวที่เปิดอยู่ หรือ PIN ไม่ถูกต้อง' },
            });
        }

        // Find student
        const student = await Student.findOne({
            where: { student_id },
        });

        if (!student) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบรหัสนักศึกษานี้ในระบบ' },
            });
        }

        // Check attendance requirement
        if (session.require_attendance && session.linked_attendance_session_id) {
            const attendanceRecord = await AttendanceRecord.findOne({
                where: {
                    attendance_session_id: session.linked_attendance_session_id,
                    student_id: student.id,
                    status: { [Op.in]: ['present', 'late'] },
                },
            });

            if (!attendanceRecord) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'กรุณาเช็คชื่อก่อนจองคิว' },
                });
            }
        }

        // Find desk
        const desk = await Desk.findOne({
            where: {
                classroom_id: session.classroom_id,
                number: desk_number,
                is_enabled: true,
            },
        });

        if (!desk) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบโต๊ะหมายเลขนี้' },
            });
        }

        // Check desk status
        let deskStatus = await QueueDeskStatus.findOne({
            where: {
                queue_session_id: session.id,
                desk_id: desk.id,
            },
            transaction,
        });

        // If grading type, check if desk already completed
        if (booking_type === 'grading') {
            if (deskStatus && deskStatus.grading_status === 'completed') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'โต๊ะนี้ได้รับการตรวจแล้ว' },
                });
            }

            if (deskStatus && ['waiting', 'in_progress'].includes(deskStatus.grading_status)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: { message: 'โต๊ะนี้มีการจองตรวจงานอยู่แล้ว' },
                });
            }
        }

        // Get next queue number
        const lastBooking = await QueueBooking.findOne({
            where: {
                queue_session_id: session.id,
                booking_type,
            },
            order: [['queue_number', 'DESC']],
            transaction,
        });

        const queueNumber = lastBooking ? lastBooking.queue_number + 1 : 1;

        // Create booking
        const booking = await QueueBooking.create(
            {
                queue_session_id: session.id,
                student_id: student.id,
                desk_id: desk.id,
                desk_number,
                booking_type,
                queue_number: queueNumber,
                note,
                status: 'waiting',
            },
            { transaction }
        );

        // Update desk status
        if (!deskStatus) {
            deskStatus = await QueueDeskStatus.create(
                {
                    queue_session_id: session.id,
                    desk_id: desk.id,
                },
                { transaction }
            );
        }

        if (booking_type === 'grading') {
            await deskStatus.update(
                {
                    grading_status: 'waiting',
                    grading_booking_id: booking.id,
                },
                { transaction }
            );
        } else {
            await deskStatus.update(
                {
                    help_status: 'waiting',
                    help_booking_id: booking.id,
                },
                { transaction }
            );
        }

        await transaction.commit();

        logger.debug(`Booking created: id=${booking.id}, session=${session.id}`);

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        logger.debug(`Socket.io instance: ${io ? 'available' : 'NOT AVAILABLE'}`);
        
        if (io) {
            io.to(`queue-${session.id}`).emit('new-booking', {
                booking: {
                    ...booking.toJSON(),
                    student: {
                        id: student.id,
                        student_id: student.student_id,
                        full_name: student.full_name,
                    },
                },
            });

            // Try to assign to available worker
            await tryAssignBooking(session.id, booking.id, io);
        }

        res.status(201).json({
            success: true,
            data: {
                ...booking.toJSON(),
                queue_number: queueNumber,
                session_title: session.title,
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Try to assign a booking to an available worker
 */
const tryAssignBooking = async (sessionId, bookingId, io) => {
    try {
        logger.debug(`Trying to assign booking ${bookingId} for session ${sessionId}`);
        
        const booking = await QueueBooking.findByPk(bookingId);
        if (!booking || booking.status !== 'waiting') {
            logger.debug(`Booking not found or not waiting: ${booking?.status}`);
            return;
        }

        // Find available workers
        const workerCondition = {
            queue_session_id: sessionId,
            status: 'online',
        };

        if (booking.booking_type === 'grading') {
            workerCondition.accept_grading = true;
        } else {
            workerCondition.accept_help = true;
        }

        logger.debug(`Looking for workers with condition: ${JSON.stringify(workerCondition)}`);

        const availableWorker = await QueueWorker.findOne({
            where: workerCondition,
            order: [
                // Prioritize worker with least completed tasks
                [
                    booking.booking_type === 'grading'
                        ? 'total_grading_completed'
                        : 'total_help_completed',
                    'ASC',
                ],
                ['last_active_at', 'ASC'],
            ],
        });

        if (availableWorker) {
            logger.debug(`Found available worker: user_id=${availableWorker.user_id}`);
            
            // Assign booking to worker
            await booking.update({
                assigned_worker_id: availableWorker.user_id,
                assigned_at: new Date(),
                status: 'in_progress',
                started_at: new Date(),
            });

            await availableWorker.update({
                status: 'busy',
                current_booking_id: booking.id,
            });

            // Update desk status
            const deskStatus = await QueueDeskStatus.findOne({
                where: {
                    queue_session_id: sessionId,
                    desk_id: booking.desk_id,
                },
            });

            if (deskStatus) {
                if (booking.booking_type === 'grading') {
                    await deskStatus.update({ grading_status: 'in_progress' });
                } else {
                    await deskStatus.update({ help_status: 'in_progress' });
                }
            }

            // Emit assignment event
            if (io) {
                const fullBooking = await QueueBooking.findByPk(bookingId, {
                    include: [
                        { model: Student, as: 'student' },
                        { model: Desk, as: 'desk' },
                    ],
                });

                io.to(`queue-${sessionId}`).emit('booking-assigned', {
                    booking: fullBooking,
                    workerId: availableWorker.user_id,
                });

                // Emit to specific worker
                logger.debug(`Emitting new-task to worker-${availableWorker.user_id}`);
                io.to(`worker-${availableWorker.user_id}`).emit('new-task', {
                    booking: fullBooking,
                });
            }
        } else {
            logger.debug(`No available worker found for session ${sessionId}`);
        }
    } catch (error) {
        logger.error('Error assigning booking:', error);
    }
};

/**
 * Try to assign waiting bookings to a newly joined worker
 * Returns the assigned booking if found
 */
const tryAssignWaitingBookingToWorker = async (sessionId, userId, worker, io) => {
    try {
        logger.debug(`Checking for waiting bookings for new worker ${userId}`);

        // Build booking type condition based on worker preferences
        const bookingTypes = [];
        if (worker.accept_grading) bookingTypes.push('grading');
        if (worker.accept_help) bookingTypes.push('help');

        if (bookingTypes.length === 0) {
            logger.debug(`Worker ${userId} doesn't accept any booking types`);
            return null;
        }

        // Find oldest waiting booking that matches worker preferences
        const waitingBooking = await QueueBooking.findOne({
            where: {
                queue_session_id: sessionId,
                status: 'waiting',
                booking_type: { [Op.in]: bookingTypes },
            },
            order: [['created_at', 'ASC']], // Oldest first (FIFO)
            include: [
                { model: Student, as: 'student' },
                { model: Desk, as: 'desk' },
            ],
        });

        if (!waitingBooking) {
            logger.debug(`No waiting bookings found for session ${sessionId}`);
            return null;
        }

        logger.debug(`Found waiting booking ${waitingBooking.id}, assigning to worker ${userId}`);

        // Assign booking to worker
        await waitingBooking.update({
            assigned_worker_id: userId,
            assigned_at: new Date(),
            status: 'in_progress',
            started_at: new Date(),
        });

        await worker.update({
            status: 'busy',
            current_booking_id: waitingBooking.id,
        });

        // Update desk status
        const deskStatus = await QueueDeskStatus.findOne({
            where: {
                queue_session_id: sessionId,
                desk_id: waitingBooking.desk_id,
            },
        });

        if (deskStatus) {
            if (waitingBooking.booking_type === 'grading') {
                await deskStatus.update({ grading_status: 'in_progress' });
            } else {
                await deskStatus.update({ help_status: 'in_progress' });
            }
        }

        // Emit assignment events to projector/queue room
        io.to(`queue-${sessionId}`).emit('booking-assigned', {
            booking: waitingBooking,
            workerId: userId,
        });

        // Emit to student's booking room
        io.to(`booking-${waitingBooking.id}`).emit('booking-assigned', {
            booking: waitingBooking,
        });

        // Return the assigned booking (socket emit to worker will be handled by response)
        return waitingBooking;

    } catch (error) {
        logger.error('Error assigning waiting booking to worker:', error);
        return null;
    }
};

/**
 * Get booking status (Student view)
 */
const getBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await QueueBooking.findByPk(bookingId, {
            include: [
                {
                    model: QueueSession,
                    as: 'queueSession',
                    attributes: ['id', 'title', 'status'],
                },
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'student_id', 'full_name'],
                },
                {
                    model: User,
                    as: 'assignedWorker',
                    attributes: ['id', 'full_name'],
                },
            ],
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบข้อมูลการจอง' },
            });
        }

        // Get position in queue
        const position = await QueueBooking.count({
            where: {
                queue_session_id: booking.queue_session_id,
                booking_type: booking.booking_type,
                status: 'waiting',
                queue_number: { [Op.lt]: booking.queue_number },
            },
        });

        res.json({
            success: true,
            data: {
                ...booking.toJSON(),
                position_in_queue: position + 1,
            },
        });
    } catch (error) {
        console.error('Error getting booking status:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Complete booking (Worker)
 */
const completeBooking = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { bookingId } = req.params;
        const { score, sub_item_scores, score_comment, worker_note } = req.body;

        const booking = await QueueBooking.findByPk(bookingId, {
            include: [
                { 
                    model: QueueSession, 
                    as: 'queueSession',
                    include: [
                        {
                            model: Assignment,
                            as: 'linkedAssignment',
                            include: [
                                { model: AssignmentSubItem, as: 'subItems' }
                            ]
                        }
                    ]
                },
                { model: Student, as: 'student' },
            ],
            transaction,
        });

        if (!booking) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบข้อมูลการจอง' },
            });
        }

        // Verify worker
        if (booking.assigned_worker_id !== req.user.id) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: { message: 'คุณไม่ใช่ผู้รับงานนี้' },
            });
        }

        // Check if assignment has sub-items
        const linkedAssignment = booking.queueSession?.linkedAssignment;
        const assignmentSubItems = linkedAssignment?.subItems || [];
        const hasSubItems = assignmentSubItems.length > 0;

        // Update booking
        await booking.update(
            {
                status: 'completed',
                completed_at: new Date(),
                score,
                score_comment,
                worker_note,
            },
            { transaction }
        );

        // Determine if all sub-items are scored for this student
        let allSubItemsScored = true;
        if (hasSubItems && booking.booking_type === 'grading') {
            // Get all existing scores for this student on this assignment
            const existingScores = await Score.findAll({
                where: {
                    assignment_id: booking.queueSession.linked_assignment_id,
                    student_id: booking.student_id,
                    sub_item_id: { [Op.ne]: null }, // Only sub-item scores
                },
                transaction,
            });

            // Count how many sub-items will be scored after this submission
            const scoredSubItemIds = new Set(existingScores.map(s => s.sub_item_id));
            
            // Add the new sub-item scores from this submission
            if (sub_item_scores && Array.isArray(sub_item_scores)) {
                sub_item_scores.forEach(s => scoredSubItemIds.add(s.sub_item_id));
            }

            // Check if all sub-items are scored
            allSubItemsScored = scoredSubItemIds.size >= assignmentSubItems.length;
            
            logger.debug(`Sub-items check: ${scoredSubItemIds.size}/${assignmentSubItems.length} scored, allScored: ${allSubItemsScored}`);
        }

        // Update desk status
        const deskStatus = await QueueDeskStatus.findOne({
            where: {
                queue_session_id: booking.queue_session_id,
                desk_id: booking.desk_id,
            },
            transaction,
        });

        if (deskStatus) {
            if (booking.booking_type === 'grading') {
                // For grading: only mark as completed if all sub-items are scored
                // If not all scored, reset to not_started so student can book again
                const newGradingStatus = (hasSubItems && !allSubItemsScored) ? 'not_started' : 'completed';
                
                await deskStatus.update(
                    {
                        grading_status: newGradingStatus,
                        grading_booking_id: null,
                    },
                    { transaction }
                );
                
                logger.debug(`Desk ${booking.desk_number} grading_status set to: ${newGradingStatus}`);
            } else {
                await deskStatus.update(
                    {
                        help_status: 'none',
                        help_booking_id: null,
                    },
                    { transaction }
                );
            }
        }

        // Update worker stats and status
        const worker = await QueueWorker.findOne({
            where: {
                queue_session_id: booking.queue_session_id,
                user_id: req.user.id,
            },
            transaction,
        });

        if (worker) {
            const updateData = {
                status: 'online',
                current_booking_id: null,
                last_active_at: new Date(),
            };

            if (booking.booking_type === 'grading') {
                updateData.total_grading_completed = worker.total_grading_completed + 1;
            } else {
                updateData.total_help_completed = worker.total_help_completed + 1;
            }

            await worker.update(updateData, { transaction });
        }

        // Save score to Score table if assignment is linked
        if (
            booking.booking_type === 'grading' &&
            booking.queueSession.linked_assignment_id
        ) {
            // Check if we have sub-item scores
            if (sub_item_scores && Array.isArray(sub_item_scores) && sub_item_scores.length > 0) {
                // Save each sub-item score
                for (const subItemScore of sub_item_scores) {
                    const whereClause = {
                        assignment_id: booking.queueSession.linked_assignment_id,
                        student_id: booking.student_id,
                        sub_item_id: subItemScore.sub_item_id,
                    };

                    const [scoreRecord, created] = await Score.findOrCreate({
                        where: whereClause,
                        defaults: {
                            score: subItemScore.score,
                            comment: score_comment,
                            graded_by: req.user.id,
                            graded_at: new Date(),
                            status: 'graded',
                        },
                        transaction,
                    });

                    if (!created) {
                        await scoreRecord.update({
                            score: subItemScore.score,
                            comment: score_comment,
                            graded_by: req.user.id,
                            graded_at: new Date(),
                            status: 'graded',
                        }, { transaction });
                    }
                }
            } else if (score !== undefined && score !== null) {
                // Save single score (no sub-items)
                const whereClause = {
                    assignment_id: booking.queueSession.linked_assignment_id,
                    student_id: booking.student_id,
                    sub_item_id: null,
                };

                const [scoreRecord, created] = await Score.findOrCreate({
                    where: whereClause,
                    defaults: {
                        score,
                        comment: score_comment,
                        graded_by: req.user.id,
                        graded_at: new Date(),
                        status: 'graded',
                    },
                    transaction,
                });

                if (!created) {
                    await scoreRecord.update({
                        score,
                        comment: score_comment,
                        graded_by: req.user.id,
                        graded_at: new Date(),
                        status: 'graded',
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.to(`queue-${booking.queue_session_id}`).emit('booking-completed', {
                bookingId: booking.id,
                deskNumber: booking.desk_number,
                bookingType: booking.booking_type,
            });

            // Emit to student
            io.to(`booking-${booking.id}`).emit('your-booking-completed', {
                booking: booking.toJSON(),
            });

            // Notify all waiting students that queue position may have changed
            io.to(`queue-${booking.queue_session_id}`).emit('queue-position-updated', {
                completedBookingType: booking.booking_type,
                completedQueueNumber: booking.queue_number,
            });

            // Try to assign next booking to this worker
            await tryAssignNextBooking(booking.queue_session_id, req.user.id, io);
        }

        res.json({
            success: true,
            data: booking,
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error completing booking:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Try to assign next waiting booking to a worker
 */
const tryAssignNextBooking = async (sessionId, workerId, io) => {
    try {
        const worker = await QueueWorker.findOne({
            where: {
                queue_session_id: sessionId,
                user_id: workerId,
                status: 'online',
            },
        });

        if (!worker) return;

        // Find next waiting booking matching worker preferences
        const whereCondition = {
            queue_session_id: sessionId,
            status: 'waiting',
        };

        if (worker.accept_grading && worker.accept_help) {
            whereCondition.booking_type = { [Op.in]: ['grading', 'help'] };
        } else if (worker.accept_grading) {
            whereCondition.booking_type = 'grading';
        } else if (worker.accept_help) {
            whereCondition.booking_type = 'help';
        } else {
            return;
        }

        const nextBooking = await QueueBooking.findOne({
            where: whereCondition,
            order: [
                ['booking_type', 'ASC'], // Grading first
                ['queue_number', 'ASC'],
            ],
        });

        if (nextBooking) {
            await tryAssignBooking(sessionId, nextBooking.id, io);
        }
    } catch (error) {
        console.error('Error assigning next booking:', error);
    }
};

/**
 * Skip/Cancel booking (Worker)
 */
const skipBooking = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        const booking = await QueueBooking.findByPk(bookingId, { transaction });

        if (!booking) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบข้อมูลการจอง' },
            });
        }

        // Mark as no_show
        await booking.update(
            {
                status: 'no_show',
                worker_note: reason || 'ไม่พบนักศึกษา',
                completed_at: new Date(),
            },
            { transaction }
        );

        // Update desk status
        const deskStatus = await QueueDeskStatus.findOne({
            where: {
                queue_session_id: booking.queue_session_id,
                desk_id: booking.desk_id,
            },
            transaction,
        });

        if (deskStatus) {
            if (booking.booking_type === 'grading') {
                await deskStatus.update(
                    {
                        grading_status: 'not_started',
                        grading_booking_id: null,
                    },
                    { transaction }
                );
            } else {
                await deskStatus.update(
                    {
                        help_status: 'none',
                        help_booking_id: null,
                    },
                    { transaction }
                );
            }
        }

        // Free up worker
        const worker = await QueueWorker.findOne({
            where: {
                queue_session_id: booking.queue_session_id,
                user_id: req.user.id,
            },
            transaction,
        });

        if (worker) {
            await worker.update(
                {
                    status: 'online',
                    current_booking_id: null,
                    last_active_at: new Date(),
                },
                { transaction }
            );
        }

        await transaction.commit();

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.to(`queue-${booking.queue_session_id}`).emit('booking-skipped', {
                bookingId: booking.id,
                deskNumber: booking.desk_number,
            });

            // Try to assign next booking
            await tryAssignNextBooking(booking.queue_session_id, req.user.id, io);
        }

        res.json({
            success: true,
            message: 'ข้ามคิวสำเร็จ',
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error skipping booking:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Get all bookings for a session
 */
const getSessionBookings = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status, booking_type } = req.query;

        const where = { queue_session_id: sessionId };
        if (status) where.status = status;
        if (booking_type) where.booking_type = booking_type;

        const bookings = await QueueBooking.findAll({
            where,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'student_id', 'full_name'],
                },
                {
                    model: Desk,
                    as: 'desk',
                    attributes: ['id', 'number', 'type'],
                },
                {
                    model: User,
                    as: 'assignedWorker',
                    attributes: ['id', 'full_name'],
                },
            ],
            order: [['queue_number', 'ASC']],
        });

        res.json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error('Error getting session bookings:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Get desk statuses for projector view
 */
const getDeskStatuses = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QueueSession.findByPk(sessionId, {
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    include: [
                        {
                            model: Desk,
                            as: 'desks',
                            where: { is_enabled: true },
                            required: false,
                        },
                    ],
                },
            ],
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'ไม่พบ Queue Session' },
            });
        }

        const deskStatuses = await QueueDeskStatus.findAll({
            where: { queue_session_id: sessionId },
        });

        // Map desk statuses to desks
        const statusMap = {};
        deskStatuses.forEach((ds) => {
            statusMap[ds.desk_id] = ds;
        });

        const desksWithStatus = session.classroom.desks.map((desk) => ({
            ...desk.toJSON(),
            status: statusMap[desk.id] || {
                grading_status: 'not_started',
                help_status: 'none',
            },
        }));

        // Get queue statistics
        const queueStats = await QueueBooking.findAll({
            where: { queue_session_id: sessionId, status: 'waiting' },
            attributes: [
                'booking_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['booking_type'],
            raw: true,
        });

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    title: session.title,
                    pin_code: session.pin_code,
                    status: session.status,
                },
                classroom: {
                    id: session.classroom.id,
                    name: session.classroom.name,
                    building: session.classroom.building,
                },
                desks: desksWithStatus,
                queueStats: {
                    grading_waiting: queueStats.find((s) => s.booking_type === 'grading')?.count || 0,
                    help_waiting: queueStats.find((s) => s.booking_type === 'help')?.count || 0,
                },
            },
        });
    } catch (error) {
        console.error('Error getting desk statuses:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * Verify PIN and get session info (for student booking page)
 */
const verifyPIN = async (req, res) => {
    try {
        const { pin_code } = req.body;

        const session = await QueueSession.findOne({
            where: { pin_code, status: 'active' },
            include: [
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'building'],
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'code', 'name'],
                },
            ],
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'PIN ไม่ถูกต้อง หรือไม่มีการเปิดรับจองคิว' },
            });
        }

        res.json({
            success: true,
            data: {
                session_id: session.id,
                title: session.title,
                course: session.course,
                classroom: session.classroom,
                require_attendance: session.require_attendance,
            },
        });
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

module.exports = {
    // Session management
    getQueueSessions,
    getQueueSession,
    createQueueSession,
    updateQueueSession,
    updateQueueSessionStatus,
    deleteQueueSession,
    regeneratePIN,

    // Worker management
    joinAsWorker,
    leaveAsWorker,
    getWorkers,

    // Booking management
    createBooking,
    getBookingStatus,
    completeBooking,
    skipBooking,
    getSessionBookings,

    // Projector view
    getDeskStatuses,

    // Public
    verifyPIN,
};
