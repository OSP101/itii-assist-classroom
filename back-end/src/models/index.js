const { sequelize } = require('../config/database');
const User = require('./User');
const Student = require('./Student');
const RefreshToken = require('./RefreshToken');
const SystemLog = require('./SystemLog');
const Course = require('./Course');
const CourseSection = require('./CourseSection');
const CourseTA = require('./CourseTA');
const CourseSectionStudent = require('./CourseSectionStudent');
const Classroom = require('./Classroom');
const Desk = require('./Desk');
const Feedback = require('./Feedback');
const StudentGroup = require('./StudentGroup');
const StudentGroupMember = require('./StudentGroupMember');
const Assignment = require('./Assignment');
const AssignmentSubItem = require('./AssignmentSubItem');
const Score = require('./Score');
const ScoreEditRequest = require('./ScoreEditRequest');
const AttendanceSession = require('./AttendanceSession');
const AttendanceRecord = require('./AttendanceRecord');
const BonusScore = require('./BonusScore');

// ============================================
// Define Associations
// ============================================

// User -> Student (linked_student_id)
User.belongsTo(Student, {
  foreignKey: 'linked_student_id',
  as: 'linkedStudent',
});

Student.hasOne(User, {
  foreignKey: 'linked_student_id',
  as: 'userAccount',
});

// User -> RefreshToken
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// User -> SystemLog
User.hasMany(SystemLog, {
  foreignKey: 'actor_user_id',
  as: 'logs',
});

SystemLog.belongsTo(User, {
  foreignKey: 'actor_user_id',
  as: 'actor',
});

// ============================================
// Course Associations
// ============================================

// Course -> Instructor (User)
Course.belongsTo(User, {
  foreignKey: 'instructor_id',
  as: 'instructor',
});

User.hasMany(Course, {
  foreignKey: 'instructor_id',
  as: 'instructorCourses',
});

// Course -> Sections
Course.hasMany(CourseSection, {
  foreignKey: 'course_id',
  as: 'sections',
});

CourseSection.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// Course -> TAs (through CourseTA)
Course.belongsToMany(User, {
  through: CourseTA,
  foreignKey: 'course_id',
  otherKey: 'user_id',
  as: 'tas',
});

User.belongsToMany(Course, {
  through: CourseTA,
  foreignKey: 'user_id',
  otherKey: 'course_id',
  as: 'taCourses',
});

CourseTA.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

CourseTA.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'taUser',
});

// CourseSection -> Students (through CourseSectionStudent)
CourseSection.belongsToMany(Student, {
  through: CourseSectionStudent,
  foreignKey: 'course_section_id',
  otherKey: 'student_id',
  as: 'students',
});

Student.belongsToMany(CourseSection, {
  through: CourseSectionStudent,
  foreignKey: 'student_id',
  otherKey: 'course_section_id',
  as: 'sections',
});

CourseSectionStudent.belongsTo(CourseSection, {
  foreignKey: 'course_section_id',
  as: 'section',
});

CourseSectionStudent.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// ============================================
// Classroom Associations
// ============================================

// Classroom -> User (created_by)
Classroom.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});

User.hasMany(Classroom, {
  foreignKey: 'created_by',
  as: 'createdClassrooms',
});

// Classroom -> Desks
Classroom.hasMany(Desk, {
  foreignKey: 'classroom_id',
  as: 'desks',
});

Desk.belongsTo(Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom',
});

// Feedback -> User
Feedback.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Feedback.belongsTo(User, {
  foreignKey: 'resolved_by',
  as: 'resolver',
});

User.hasMany(Feedback, {
  foreignKey: 'user_id',
  as: 'feedbacks',
});

// ============================================
// Student Group Associations
// ============================================

// StudentGroup -> Course
StudentGroup.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

Course.hasMany(StudentGroup, {
  foreignKey: 'course_id',
  as: 'studentGroups',
});

// StudentGroup -> Members (through StudentGroupMember)
StudentGroup.belongsToMany(Student, {
  through: StudentGroupMember,
  foreignKey: 'group_id',
  otherKey: 'student_id',
  as: 'members',
});

Student.belongsToMany(StudentGroup, {
  through: StudentGroupMember,
  foreignKey: 'student_id',
  otherKey: 'group_id',
  as: 'groups',
});

StudentGroupMember.belongsTo(StudentGroup, {
  foreignKey: 'group_id',
  as: 'group',
});

StudentGroupMember.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// ============================================
// Assignment & Score Associations
// ============================================

// Assignment -> Course
Assignment.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

Course.hasMany(Assignment, {
  foreignKey: 'course_id',
  as: 'assignments',
});

// Assignment -> Creator (User)
Assignment.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});

// Assignment -> SubItems
Assignment.hasMany(AssignmentSubItem, {
  foreignKey: 'assignment_id',
  as: 'subItems',
});

AssignmentSubItem.belongsTo(Assignment, {
  foreignKey: 'assignment_id',
  as: 'assignment',
});

// Assignment -> AttendanceSession (optional link)
Assignment.belongsTo(AttendanceSession, {
  foreignKey: 'linked_attendance_session_id',
  as: 'linkedAttendanceSession',
});

AttendanceSession.hasMany(Assignment, {
  foreignKey: 'linked_attendance_session_id',
  as: 'linkedAssignments',
});

// Score -> SubItem (optional)
Score.belongsTo(AssignmentSubItem, {
  foreignKey: 'sub_item_id',
  as: 'subItem',
});

AssignmentSubItem.hasMany(Score, {
  foreignKey: 'sub_item_id',
  as: 'scores',
});

// Score -> Assignment
Score.belongsTo(Assignment, {
  foreignKey: 'assignment_id',
  as: 'assignment',
});

Assignment.hasMany(Score, {
  foreignKey: 'assignment_id',
  as: 'scores',
});

// Score -> Student
Score.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

Student.hasMany(Score, {
  foreignKey: 'student_id',
  as: 'scores',
});

// Score -> Group (optional)
Score.belongsTo(StudentGroup, {
  foreignKey: 'group_id',
  as: 'group',
});

// Score -> Grader (User)
Score.belongsTo(User, {
  foreignKey: 'graded_by',
  as: 'grader',
});

// ScoreEditRequest -> Score
ScoreEditRequest.belongsTo(Score, {
  foreignKey: 'score_id',
  as: 'score',
});

Score.hasMany(ScoreEditRequest, {
  foreignKey: 'score_id',
  as: 'editRequests',
});

// ScoreEditRequest -> Requester (User)
ScoreEditRequest.belongsTo(User, {
  foreignKey: 'requested_by',
  as: 'requester',
});

// ScoreEditRequest -> Reviewer (User)
ScoreEditRequest.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer',
});

// ============================================
// Attendance Associations
// ============================================

// AttendanceSession -> Course
AttendanceSession.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

Course.hasMany(AttendanceSession, {
  foreignKey: 'course_id',
  as: 'attendanceSessions',
});

// AttendanceSession -> CourseSection
AttendanceSession.belongsTo(CourseSection, {
  foreignKey: 'course_section_id',
  as: 'section',
});

CourseSection.hasMany(AttendanceSession, {
  foreignKey: 'course_section_id',
  as: 'attendanceSessions',
});

// AttendanceSession -> Creator (User)
AttendanceSession.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});

// AttendanceSession -> Records
AttendanceSession.hasMany(AttendanceRecord, {
  foreignKey: 'attendance_session_id',
  as: 'records',
});

AttendanceRecord.belongsTo(AttendanceSession, {
  foreignKey: 'attendance_session_id',
  as: 'session',
});

// AttendanceRecord -> Student
AttendanceRecord.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

Student.hasMany(AttendanceRecord, {
  foreignKey: 'student_id',
  as: 'attendanceRecords',
});

// AttendanceRecord -> UpdatedBy (User)
AttendanceRecord.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updater',
});

// ============================================
// Bonus Score Associations
// ============================================

// BonusScore -> Course
BonusScore.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

Course.hasMany(BonusScore, {
  foreignKey: 'course_id',
  as: 'bonusScores',
});

// BonusScore -> Student
BonusScore.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

Student.hasMany(BonusScore, {
  foreignKey: 'student_id',
  as: 'bonusScores',
});

// BonusScore -> User (given_by)
BonusScore.belongsTo(User, {
  foreignKey: 'given_by',
  as: 'giver',
});

User.hasMany(BonusScore, {
  foreignKey: 'given_by',
  as: 'givenBonusScores',
});

// ============================================
// Export all models
// ============================================
module.exports = {
  sequelize,
  User,
  Student,
  RefreshToken,
  SystemLog,
  Course,
  CourseSection,
  CourseTA,
  CourseSectionStudent,
  Classroom,
  Desk,
  Feedback,
  StudentGroup,
  StudentGroupMember,
  Assignment,
  AssignmentSubItem,
  Score,
  ScoreEditRequest,
  AttendanceSession,
  AttendanceRecord,
  BonusScore,
};
