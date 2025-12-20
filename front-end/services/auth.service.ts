/**
 * Authentication Service
 */

import apiService from './api.service';
import { API_ENDPOINTS } from '@/config/api';

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'instructor' | 'ta';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiService.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials);

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      apiService.setAuthTokens(accessToken, refreshToken);
      
      // Store user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }

      return { success: true, user };
    }

    // Extract error message - handle both string and object errors
    let errorMessage = 'เข้าสู่ระบบไม่สำเร็จ';
    if (response.message) {
      errorMessage = response.message;
    } else if (response.error) {
      if (typeof response.error === 'string') {
        errorMessage = response.error;
      } else if (typeof response.error === 'object' && response.error !== null) {
        errorMessage = (response.error as { message?: string }).message || errorMessage;
      }
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiService.clearAuthTokens();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Get current user from API
   */
  async getCurrentUser(): Promise<User | null> {
    if (!apiService.isAuthenticated()) {
      return null;
    }

    const response = await apiService.get<{ user: User }>(API_ENDPOINTS.ME);

    if (response.success && response.data) {
      const user = response.data.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      return user;
    }

    return null;
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });

    if (response.success) {
      return { success: true };
    }

    return {
      success: false,
      error: response.message || response.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
    };
  }

  /**
   * Check if user has required role
   */
  hasRole(requiredRoles: string | string[]): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
  }
}

export const authService = new AuthService();
export default authService;
