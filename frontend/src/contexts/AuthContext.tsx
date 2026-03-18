import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      // First check if we have a stored session token
      const storedToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      
      if (!storedToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setSessionToken(storedToken);

      // Verify with backend
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Invalid session, clear it
        await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Exchange session_id for session token - for Google OAuth
  const exchangeSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      console.log('Exchanging session:', sessionId);
      
      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      console.log('Session exchange response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData?.email);
        
        // Extract session token from Set-Cookie header or response
        const cookies = response.headers.get('set-cookie');
        let token = sessionId;
        
        if (cookies && cookies.includes('session_token=')) {
          const match = cookies.match(/session_token=([^;]+)/);
          if (match) {
            token = match[1];
          }
        }
        
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
        setSessionToken(token);
        setUser(userData);
        setIsLoading(false);
        
        console.log('Auth state updated, user is now authenticated');
      } else {
        console.error('Session exchange failed with status:', response.status);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Session exchange error:', error);
      setIsLoading(false);
    }
  }, []);

  // Handle deep linking for OAuth callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      if (url.includes('session_id=')) {
        const sessionId = url.split('session_id=')[1]?.split('&')[0];
        console.log('Session ID extracted:', sessionId);
        
        if (sessionId) {
          await exchangeSession(sessionId);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [exchangeSession]);

  // Login with Google
  const login = useCallback(async () => {
    try {
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      console.log('Starting login with redirect URL:', redirectUrl);
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      console.log('WebBrowser result type:', result.type);
      
      if (result.type === 'success' && result.url) {
        const url = result.url;
        console.log('OAuth callback URL:', url);
        
        if (url.includes('session_id=')) {
          const sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
          console.log('Session ID from login:', sessionId);
          
          if (sessionId) {
            await exchangeSession(sessionId);
          }
        }
      } else {
        console.log('Login was cancelled or failed:', result.type);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  }, [exchangeSession]);

  // Login with Email/Password
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.token;
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
        setSessionToken(token);
        setUser({
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        });
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('Email login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // Register with Email/Password
  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.token;
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
        setSessionToken(token);
        setUser({
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        });
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // Logout
  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      }
      
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithEmail,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to get auth headers
export function useAuthHeaders() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    AsyncStorage.getItem(SESSION_TOKEN_KEY).then(setToken);
  }, []);
  
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
