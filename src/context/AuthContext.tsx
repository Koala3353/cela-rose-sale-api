import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { decodeJwt } from '../services/auth';
import { API_BASE_URL } from '../constants';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  renderGoogleButton: (containerId: string) => void;
  signIn: () => void;
  signOut: () => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to call backend auth endpoints. Uses JWT from localStorage when available.
async function fetchAuth(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rose_jwt') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/auth${endpoint}`, {
    ...options,
    headers,
  });
  return res.json();
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Handle Google credential response
  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      console.error('No credential in response');
      return;
    }

    setIsLoading(true);
    try {
      // Send ID token to backend for verification. Backend returns a JWT.
      const authResp = await fetchAuth('/google', {
        method: 'POST',
        body: JSON.stringify({ idToken: response.credential }),
      });

      if (!authResp.success) {
        throw new Error(authResp.error || 'Auth failed');
      }

      const u = authResp.data.user;
      const token = authResp.data.token;
      if (token) {
        try {
          localStorage.setItem('rose_jwt', token);
        } catch (e) {
          console.warn('Failed to persist JWT to localStorage', e);
        }

        // Optimistically decode token to set user immediately for snappy UI
        const decoded = decodeJwt(token);
        if (decoded) {
          const optimistic: User = {
            id: decoded.id || u.id,
            email: decoded.email || u.email,
            name: decoded.name || u.name,
            photoUrl: u.photoUrl || '',
            studentId: '',
            contactNumber: '',
            facebookLink: '',
          };
          setUser(optimistic);
        }
      }

      // Finalize with backend-provided user info (ensures consistency)
      const loggedIn: User = {
        id: u.id,
        email: u.email,
        name: u.name,
        photoUrl: u.photoUrl || '',
        studentId: '',
        contactNumber: '',
        facebookLink: '',
      };
      setUser(loggedIn);
    } catch (err) {
      console.error('Backend auth failed', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore session from backend on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // If we have a JWT, try to restore user from backend /auth/me
        const token = localStorage.getItem('rose_jwt');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Optimistically restore user from token while validating with backend
        const decoded = decodeJwt(token);
        if (decoded) {
          setUser({
            id: decoded.id || '',
            email: decoded.email || '',
            name: decoded.name || '',
            photoUrl: '',
            studentId: '',
            contactNumber: '',
            facebookLink: '',
          });
        }

        const resp = await fetchAuth('/me');
        if (resp.success && resp.data?.user) {
          const u = resp.data.user;
          const restored: User = {
            id: u.id,
            email: u.email,
            name: u.name,
            photoUrl: u.photoUrl || '',
            studentId: '',
            contactNumber: '',
            facebookLink: '',
          };
          // Merge with any stored profile data
          const storedProfile = localStorage.getItem('rose_user_profile');
          if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            Object.assign(restored, profile);
          }
          setUser(restored);
        } else {
          // Token invalid or no user - clear stored data
          localStorage.removeItem('rose_user_profile');
          localStorage.removeItem('rose_jwt');
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
        localStorage.removeItem('rose_jwt');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    // Load Google Identity Services script
    // Hardcoded for GitHub Pages deployment (env vars don't work with static hosting)
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '209811888034-djp2budt4vnifesedsk8ujfnip314l1m.apps.googleusercontent.com';
    if (clientId && typeof window !== 'undefined') {
      const scriptId = 'google-identity-services';

      const initGoogle = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          setGoogleReady(true);
        }
      };

      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.id = scriptId;
        s.async = true;
        s.defer = true;
        s.onload = initGoogle;
        document.head.appendChild(s);
      } else {
        initGoogle();
      }
    }
  }, [handleCredentialResponse]);

  // Render Google Sign-In button into a container
  const renderGoogleButton = useCallback((containerId: string) => {
    if (!googleReady) {
      // Wait for Google to be ready
      const checkInterval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(checkInterval);
          const container = document.getElementById(containerId);
          if (container) {
            (window as any).google.accounts.id.renderButton(container, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              width: 300,
            });
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 5000);
      return;
    }

    const container = document.getElementById(containerId);
    if (container) {
      (window as any).google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 300,
      });
    }
  }, [googleReady]);

  const logout = async () => {
    try {
      await fetchAuth('/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setUser(null);
    localStorage.removeItem('rose_user_profile');
    localStorage.removeItem('rose_jwt');
    // Revoke google session
    if ((window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.disableAutoSelect();
      } catch { }
    }
  };

  // Trigger Google One Tap sign-in prompt or show modal
  const signIn = useCallback(() => {
    // Show the login modal with the Google button
    setShowLoginModal(true);
  }, []);

  // Alias for logout
  const signOut = logout;

  const updateProfile = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      // Store profile fields locally (backend only stores core identity)
      localStorage.setItem('rose_user_profile', JSON.stringify({
        studentId: updated.studentId,
        contactNumber: updated.contactNumber,
        facebookLink: updated.facebookLink,
      }));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, showLoginModal, setShowLoginModal, renderGoogleButton, signIn, signOut, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};