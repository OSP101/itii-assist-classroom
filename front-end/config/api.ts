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
  COURSES: '/courses',
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
