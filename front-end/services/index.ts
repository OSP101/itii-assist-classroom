export { apiService } from './api.service';
export { authService } from './auth.service';
export { userService } from './user.service';
export { studentService } from './student.service';
export { courseService } from './course.service';
export type { User, LoginCredentials, LoginResponse, AuthState } from './auth.service';
export type { 
  User as UserModel, 
  CreateUserDto, 
  UpdateUserDto, 
  UserListParams, 
  UserListResponse, 
  UserStats 
} from './user.service';
export type {
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  StudentListParams,
  StudentListResponse,
  StudentStats,
} from './student.service';
export type {
  Course,
  CourseSection,
  Instructor,
  TA,
  CreateCourseDto,
  UpdateCourseDto,
  CourseListParams,
  CourseListResponse,
  CourseStats,
  SectionStudent,
} from './course.service';
