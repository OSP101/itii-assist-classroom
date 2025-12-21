/**
 * Student Service - API calls for Student Management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '@/config/api';

// Types
export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  email: string | null;
  extra: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentDto {
  student_id: string;
  full_name: string;
  email?: string;
  extra?: Record<string, unknown>;
}

export interface UpdateStudentDto {
  student_id?: string;
  full_name?: string;
  email?: string;
  extra?: Record<string, unknown>;
  is_active?: boolean;
}

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface StudentListResponse {
  students: Student[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore: boolean;
  };
}

export interface StudentStats {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
  };
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ student_id: string; error: string }>;
}

class StudentService {
  /**
   * Get list of students with pagination and filters
   */
  async getStudents(params?: StudentListParams) {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    return apiService.get<StudentListResponse>(API_ENDPOINTS.STUDENTS, { params: queryParams });
  }

  /**
   * Get student statistics
   */
  async getStats() {
    return apiService.get<StudentStats>(`${API_ENDPOINTS.STUDENTS}/stats`);
  }

  /**
   * Get single student by ID
   */
  async getStudentById(id: number) {
    return apiService.get<Student>(`${API_ENDPOINTS.STUDENTS}/${id}`);
  }

  /**
   * Create new student
   */
  async createStudent(data: CreateStudentDto) {
    return apiService.post<Student>(API_ENDPOINTS.STUDENTS, data);
  }

  /**
   * Update student
   */
  async updateStudent(id: number, data: UpdateStudentDto) {
    return apiService.put<Student>(`${API_ENDPOINTS.STUDENTS}/${id}`, data);
  }

  /**
   * Delete student
   */
  async deleteStudent(id: number) {
    return apiService.delete(`${API_ENDPOINTS.STUDENTS}/${id}`);
  }

  /**
   * Toggle student active status
   */
  async toggleStatus(id: number) {
    return apiService.patch<Student>(`${API_ENDPOINTS.STUDENTS}/${id}/status`);
  }

  /**
   * Import students from array
   */
  async importStudents(students: CreateStudentDto[]) {
    return apiService.post<ImportResult>(`${API_ENDPOINTS.STUDENTS}/import`, { students });
  }
}

export const studentService = new StudentService();
export default studentService;
