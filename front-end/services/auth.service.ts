/**
 * Authentication Service
 */

import apiService from './api.service';
import { API_ENDPOINTS } from '@/config/api';

// BroadcastChannel for cross-tab auth sync
let authChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  authChannel = new BroadcastChannel('auth-sync');
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'instructor' | 'ta';
  avatar: string | null;
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
  mustChangePassword?: boolean;
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
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; mustChangePassword?: boolean; error?: string }> {
    const response = await apiService.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials);

    if (response.success && response.data) {
      const { user, accessToken, refreshToken, mustChangePassword } = response.data;
      
      // Store tokens
      apiService.setAuthTokens(accessToken, refreshToken);
      
      // Store user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }

      return { success: true, user, mustChangePassword };
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
        // Broadcast logout to other tabs
        authChannel?.postMessage({ type: 'logout' });
      }
    }
  }

  /**
   * Subscribe to auth changes from other tabs
   */
  onAuthChange(callback: (event: { type: 'logout' | 'login' }) => void): () => void {
    if (!authChannel) return () => {};
    
    const handler = (event: MessageEvent) => {
      callback(event.data);
    };
    
    authChannel.addEventListener('message', handler);
    return () => authChannel?.removeEventListener('message', handler);
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
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
      confirmPassword,
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
   * Update user profile
   */
  async updateProfile(data: { full_name?: string; email?: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiService.put<{ user: User }>(API_ENDPOINTS.UPDATE_PROFILE, data);

    if (response.success && response.data) {
      const user = response.data.user;
      // Update stored user
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      return { success: true, user };
    }

    return {
      success: false,
      error: response.message || response.error || 'อัปเดตโปรไฟล์ไม่สำเร็จ',
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

  /**
   * Set tokens manually (for OAuth callback)
   */
  setTokens(accessToken: string, refreshToken: string): void {
    apiService.setAuthTokens(accessToken, refreshToken);
  }

  /**
   * Clear tokens (for logout or error)
   */
  clearTokens(): void {
    apiService.clearAuthTokens();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  }

  /**
   * Get user info from API (for OAuth callback)
   */
  async getMe(): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await apiService.get<{ user: User }>(API_ENDPOINTS.ME);

    if (response.success && response.data) {
      const user = response.data.user;
      // Store user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      return { success: true, user };
    }

    return {
      success: false,
      error: response.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้',
    };
  }

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl(): string {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${apiBaseUrl}/auth/google`;
  }

  /**
   * Force change password (for first login)
   */
  async forceChangePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.post<{ message: string }>('/auth/force-change-password', { newPassword });

    if (response.success) {
      // Clear tokens after password change - user needs to login again
      this.clearTokens();
      return { success: true };
    }

    return {
      success: false,
      error: response.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
    };
  }
}

export const authService = new AuthService();
export default authService;
