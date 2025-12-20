export interface DecodedToken {
  id?: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
}

// Decode a JWT without verifying signature (client-side only, for UI use)
export function decodeJwt(token: string | null): DecodedToken | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (err) {
    console.warn('Failed to decode JWT', err);
    return null;
  }
}

// Return Authorization headers object if token exists
export function getAuthHeaders(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rose_jwt') : null;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    return {};
  }
}
