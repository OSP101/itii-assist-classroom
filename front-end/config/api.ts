/**
 * API Configuration
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  CHANGE_PASSWORD: '/auth/change-password',
  GOOGLE_AUTH: '/auth/google',

  // System (Admin)
  SYSTEM_METRICS: '/system/metrics',
  SYSTEM_CPU: '/system/cpu',
  SYSTEM_MEMORY: '/system/memory',
  SYSTEM_INFO: '/system/info',

  // Users (Admin)
  USERS: '/users',

  // Students
  STUDENTS: '/students',

  // Courses
  COURSES: {
    LIST: '/courses',
    STATS: '/courses/stats',
    BY_ID: (id: number) => `/courses/${id}`,
    CREATE: '/courses',
    UPDATE: (id: number) => `/courses/${id}`,
    DELETE: (id: number) => `/courses/${id}`,
    TOGGLE_STATUS: (id: number) => `/courses/${id}/toggle-status`,
    INSTRUCTORS: '/courses/instructors',
    TAS_LIST: '/courses/tas-list',
    // Sections
    ADD_SECTION: (courseId: number) => `/courses/${courseId}/sections`,
    REMOVE_SECTION: (courseId: number, sectionId: number) => `/courses/${courseId}/sections/${sectionId}`,
    // TAs
    ADD_TA: (courseId: number) => `/courses/${courseId}/tas`,
    REMOVE_TA: (courseId: number, userId: number) => `/courses/${courseId}/tas/${userId}`,
    // Students
    SECTION_STUDENTS: (courseId: number, sectionId: number) => `/courses/${courseId}/sections/${sectionId}/students`,
    ADD_STUDENT: (courseId: number, sectionId: number) => `/courses/${courseId}/sections/${sectionId}/students`,
    REMOVE_STUDENT: (courseId: number, sectionId: number, studentId: number) => `/courses/${courseId}/sections/${sectionId}/students/${studentId}`,
  },
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
