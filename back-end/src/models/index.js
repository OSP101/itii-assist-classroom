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
};
