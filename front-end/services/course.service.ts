/**
 * Course Service - API calls for Course Management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '@/config/api';

// Types
export interface Instructor {
  id: number;
  full_name: string;
  email: string | null;
  username: string;
}

export interface TA {
  id: number;
  full_name: string;
  email: string | null;
  username: string;
  CourseTA?: {
    assigned_at: string;
  };
}

export interface CourseSection {
  id: number;
  course_id: string;
  section_no: string;
  note: string | null;
  created_at: string;
  studentCount?: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  year: number;
  semester: number;
  instructor_id: number | null;
  description: string | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  instructor?: Instructor | null;
  sections?: CourseSection[];
  tas?: TA[];
  taCount?: number;
  studentCount?: number;
}

export interface CreateCourseDto {
  code: string;
  name: string;
  year: number;
  semester: number;
  instructor_id?: number | null;
  description?: string;
  image?: string;
}

export interface UpdateCourseDto {
  code?: string;
  name?: string;
  year?: number;
  semester?: number;
  instructor_id?: number | null;
  description?: string;
  image?: string;
  is_active?: boolean;
}

export interface CourseListParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: number;
  semester?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CourseListResponse {
  courses: Course[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore: boolean;
  };
}

export interface CourseStats {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
  };
  thisYear: number;
  years: number[];
}

export interface SectionStudent {
  id: number;
  student_id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  enrolled_at: string;
}

export interface MyCoursesStats {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
  };
  years: number[];
}

class CourseService {
  /**
   * Get list of courses with pagination and filters
   */
  async getCourses(params?: CourseListParams) {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.year && !isNaN(params.year)) queryParams.year = params.year.toString();
    if (params?.semester && !isNaN(params.semester)) queryParams.semester = params.semester.toString();
    if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    return apiService.get<CourseListResponse>(API_ENDPOINTS.COURSES.LIST, { params: queryParams });
  }

  /**
   * Get course statistics
   */
  async getStats() {
    return apiService.get<CourseStats>(API_ENDPOINTS.COURSES.STATS);
  }

  /**
   * Get single course by ID
   */
  async getCourseById(id: string) {
    return apiService.get<Course>(API_ENDPOINTS.COURSES.BY_ID(id));
  }

  /**
   * Create new course
   */
  async createCourse(data: CreateCourseDto) {
    return apiService.post<Course>(API_ENDPOINTS.COURSES.CREATE, data);
  }

  /**
   * Update course
   */
  async updateCourse(id: string, data: UpdateCourseDto) {
    return apiService.put<Course>(API_ENDPOINTS.COURSES.UPDATE(id), data);
  }

  /**
   * Delete course
   */
  async deleteCourse(id: string) {
    return apiService.delete(API_ENDPOINTS.COURSES.DELETE(id));
  }

  /**
   * Toggle course status
   */
  async toggleStatus(id: string) {
    return apiService.patch<Course>(API_ENDPOINTS.COURSES.TOGGLE_STATUS(id));
  }

  /**
   * Get instructors list for dropdown
   */
  async getInstructors() {
    return apiService.get<Instructor[]>(API_ENDPOINTS.COURSES.INSTRUCTORS);
  }

  /**
   * Get TAs list for dropdown
   */
  async getTAsList() {
    return apiService.get<TA[]>(API_ENDPOINTS.COURSES.TAS_LIST);
  }

  /**
   * Get my courses (for instructor/TA)
   */
  async getMyCourses(params?: CourseListParams) {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.year && !isNaN(params.year)) queryParams.year = params.year.toString();
    if (params?.semester && !isNaN(params.semester)) queryParams.semester = params.semester.toString();
    if (params?.status && params.status.trim()) queryParams.status = params.status.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    console.log('getMyCourses queryParams:', queryParams);

    return apiService.get<CourseListResponse>(API_ENDPOINTS.COURSES.MY_COURSES, { params: queryParams });
  }

  /**
   * Get my courses statistics (for instructor/TA)
   */
  async getMyCoursesStats() {
    return apiService.get<MyCoursesStats>(API_ENDPOINTS.COURSES.MY_COURSES_STATS);
  }

  // Section Management
  /**
   * Add section to course
   */
  async addSection(courseId: string, data: { section_no: string; note?: string }) {
    return apiService.post<CourseSection>(API_ENDPOINTS.COURSES.ADD_SECTION(courseId), data);
  }

  /**
   * Remove section from course
   */
  async removeSection(courseId: string, sectionId: number) {
    return apiService.delete(API_ENDPOINTS.COURSES.REMOVE_SECTION(courseId, sectionId));
  }

  // TA Management
  /**
   * Add TA to course
   */
  async addTA(courseId: string, userId: number) {
    return apiService.post<TA>(API_ENDPOINTS.COURSES.ADD_TA(courseId), { user_id: userId });
  }

  /**
   * Remove TA from course
   */
  async removeTA(courseId: string, userId: number) {
    return apiService.delete(API_ENDPOINTS.COURSES.REMOVE_TA(courseId, userId));
  }

  // Student Management in Sections
  /**
   * Get students in section
   */
  async getSectionStudents(courseId: string, sectionId: number) {
    return apiService.get<SectionStudent[]>(API_ENDPOINTS.COURSES.SECTION_STUDENTS(courseId, sectionId));
  }

  /**
   * Add student to section
   */
  async addStudentToSection(courseId: string, sectionId: number, studentId: number) {
    return apiService.post(API_ENDPOINTS.COURSES.ADD_STUDENT(courseId, sectionId), { student_id: studentId });
  }

  /**
   * Remove student from section
   */
  async removeStudentFromSection(courseId: string, sectionId: number, studentId: number) {
    return apiService.delete(API_ENDPOINTS.COURSES.REMOVE_STUDENT(courseId, sectionId, studentId));
  }
}

export const courseService = new CourseService();
