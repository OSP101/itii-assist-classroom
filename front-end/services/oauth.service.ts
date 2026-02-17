import { apiService } from "./api.service";

export interface OAuthAccount {
  id: number;
  provider: 'google' | 'github' | 'apple';
  provider_email: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
  linked_at: string;
}

export interface OAuthServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class OAuthService {
  /**
   * Get all linked OAuth accounts for the current user
   */
  async getLinkedAccounts(): Promise<OAuthServiceResult<OAuthAccount[]>> {
    try {
      const response = await apiService.get<OAuthAccount[]>("/oauth/linked");
      if (response.success) {
        return {
          success: true,
          data: response.data || [],
        };
      }
      return {
        success: false,
        error: response.error || "Failed to get linked accounts",
        data: [],
      };
    } catch (error) {
      console.error("Get linked accounts error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get linked accounts",
        data: [],
      };
    }
  }

  /**
   * Unlink an OAuth provider account
   */
  async unlinkAccount(provider: string): Promise<OAuthServiceResult> {
    try {
      const response = await apiService.delete<{ message: string }>(`/oauth/unlink/${provider}`);
      if (response.success) {
        return {
          success: true,
          message: response.message || "Account unlinked successfully",
        };
      }
      return {
        success: false,
        error: response.error || "Failed to unlink account",
      };
    } catch (error) {
      console.error("Unlink account error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to unlink account",
      };
    }
  }

  /**
   * Get provider display name
   */
  getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      google: "Google",
      github: "GitHub",
      apple: "Apple",
    };
    return names[provider] || provider;
  }

  /**
   * Get provider icon
   */
  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      google: "logos:google-icon",
      github: "mingcute:github-fill",
      apple: "ic:baseline-apple",
    };
    return icons[provider] || "solar:link-bold";
  }

  /**
   * Initiate OAuth linking flow
   * Redirects to the OAuth provider
   */
  initiateLink(provider: string): void {
    const currentUrl = window.location.href;
    // Store return URL for after OAuth flow
    sessionStorage.setItem("oauth_return_url", currentUrl);
    
    // Get current access token for linking
    const accessToken = localStorage.getItem("accessToken");
    
    // Redirect to backend OAuth endpoint with access token
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
    const linkUrl = new URL(`${backendUrl}/auth/${provider}`);
    linkUrl.searchParams.set("action", "link");
    if (accessToken) {
      linkUrl.searchParams.set("link_token", accessToken);
    }
    window.location.href = linkUrl.toString();
  }
}

export const oauthService = new OAuthService();
