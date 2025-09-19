/**
 * Authentication utilities for Netlify Identity integration
 */

declare global {
  interface Window {
    netlifyIdentity?: {
      currentUser(): {
        token?: {
          access_token?: string;
        };
      } | null;
    };
  }
}

/**
 * Get authentication headers from Netlify Identity if available
 * @returns Promise resolving to headers object with Authorization header if user is authenticated
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // Check if Netlify Identity is available
    if (typeof window !== 'undefined' && window.netlifyIdentity) {
      const user = window.netlifyIdentity.currentUser();
      
      if (user && user.token && user.token.access_token) {
        return {
          'Authorization': `Bearer ${user.token.access_token}`
        };
      }
    }
    
    // Return empty object if no authentication is available
    return {};
  } catch (error) {
    // Silently handle errors and return empty object
    console.warn('Failed to get auth headers:', error);
    return {};
  }
}