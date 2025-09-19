/**
 * Authentication utilities
 */

/**
 * Get authentication headers if available
 * @returns Promise resolving to headers object with Authorization header if user is authenticated
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // Check for a generic auth token in localStorage
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('atlas:authToken');
      
      if (authToken) {
        return {
          'Authorization': `Bearer ${authToken}`
        };
      }
    }
    
    // Return empty object if no authentication is available
    return {};
  } catch (error) {
    // Silently handle errors and return empty object
    return {};
  }
}