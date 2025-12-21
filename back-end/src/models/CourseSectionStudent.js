const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourseSectionStudent = sequelize.define('CourseSectionStudent', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  course_section_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  student_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  tableName: 'course_section_students',
  timestamps: true,
  createdAt: 'enrolled_at',
  updatedAt: false,
});

module.exports = CourseSectionStudent;
