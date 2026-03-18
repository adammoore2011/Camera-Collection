import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL, SESSION_TOKEN_KEY } from '../config';

console.log('AuthContext - API_URL configured as:', API_URL);

// Warm up the browser on Android for faster OAuth
if (Platform.OS === 'android') {
  WebBrowser.warmUpAsync();
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    console.log('[AUTH] checkAuth called, current isLoading:', isLoading);
    
    try {
      // First check if we have a stored session token
      console.log('[AUTH] Checking AsyncStorage for token...');
      const storedToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      console.log('[AUTH] Stored token exists:', !!storedToken, 'length:', storedToken?.length);
      
      if (!storedToken) {
        console.log('[AUTH] No stored token, setting user to null');
        setUser(null);
        setIsLoading(false);
        return;
      }

      setSessionToken(storedToken);

      // Verify with backend
      console.log('[AUTH] Verifying token with backend...');
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      console.log('[AUTH] /api/auth/me response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('[AUTH] User verified:', userData.email);
        setUser(userData);
      } else {
        // Invalid session, clear it
        console.log('[AUTH] Token invalid, clearing...');
        await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Auth check error:', error);
      setUser(null);
    } finally {
      console.log('[AUTH] checkAuth complete, setting isLoading to false');
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
      console.log('Platform:', Platform.OS);
      
      // Check for session_id in the URL (supports both query string and fragment)
      let sessionId: string | null = null;
      
      if (url.includes('session_id=')) {
        // Try query parameter first
        const queryMatch = url.match(/[?&]session_id=([^&#]+)/);
        if (queryMatch) {
          sessionId = queryMatch[1];
        }
        
        // Try fragment (hash) if not found in query
        if (!sessionId) {
          const fragmentMatch = url.match(/#.*session_id=([^&]+)/);
          if (fragmentMatch) {
            sessionId = fragmentMatch[1];
          }
        }
        
        // Fallback to simple split
        if (!sessionId) {
          sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        }
      }
      
      console.log('Session ID extracted from deep link:', sessionId);
      
      if (sessionId) {
        await exchangeSession(sessionId);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check initial URL (for when app is launched from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL on app start:', url);
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
      // Dismiss any existing auth session first (fixes iOS mobile issues)
      await WebBrowser.dismissAuthSession();
      
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      console.log('Starting login with redirect URL:', redirectUrl);
      console.log('Auth URL:', authUrl);
      
      // Use options for better iOS compatibility
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
      });
      
      console.log('WebBrowser result type:', result.type);
      console.log('Full result:', JSON.stringify(result));
      
      if (result.type === 'success' && result.url) {
        const url = result.url;
        console.log('OAuth callback URL:', url);
        
        // Complete the auth session (helps iOS properly close the browser)
        WebBrowser.maybeCompleteAuthSession();
        
        if (url.includes('session_id=')) {
          const sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
          console.log('Session ID from login:', sessionId);
          
          if (sessionId) {
            await exchangeSession(sessionId);
          }
        }
      } else if (result.type === 'dismiss') {
        console.log('User dismissed the login');
      } else {
        console.log('Login was cancelled or failed:', result.type);
      }
    } catch (error) {
      console.error('Login error:', error);
      // Try to dismiss in case of error
      try {
        await WebBrowser.dismissAuthSession();
      } catch (dismissError) {
        // Ignore dismiss errors
      }
    }
  }, [exchangeSession]);

  // Login with Email/Password
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('[AUTH] Starting email login for:', email);
      console.log('[AUTH] API_URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('[AUTH] Login response status:', response.status);
      const data = await response.json();
      console.log('[AUTH] Login response data:', JSON.stringify(data).substring(0, 200));

      if (response.ok) {
        const token = data.token;
        console.log('[AUTH] Got token, length:', token?.length);
        
        // Save to AsyncStorage
        console.log('[AUTH] Saving token to AsyncStorage...');
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
        console.log('[AUTH] Token saved to AsyncStorage');
        
        // Verify it was saved
        const savedToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
        console.log('[AUTH] Verified saved token length:', savedToken?.length);
        
        // Update state
        console.log('[AUTH] Setting sessionToken state...');
        setSessionToken(token);
        
        console.log('[AUTH] Setting user state...');
        const newUser = {
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        };
        setUser(newUser);
        console.log('[AUTH] User state set:', newUser.email);
        
        setIsLoading(false);
        console.log('[AUTH] Login complete, isLoading set to false');
        return { success: true };
      } else {
        console.log('[AUTH] Login failed:', data.detail);
        setIsLoading(false);
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('[AUTH] Email login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // Register with Email/Password
  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('[AUTH] Starting registration for:', email);
      console.log('[AUTH] API_URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      console.log('[AUTH] Register response status:', response.status);
      const data = await response.json();
      console.log('[AUTH] Register response data:', JSON.stringify(data).substring(0, 200));

      if (response.ok) {
        const token = data.token;
        console.log('[AUTH] Got token, length:', token?.length);
        
        // Save to AsyncStorage
        console.log('[AUTH] Saving token to AsyncStorage...');
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
        console.log('[AUTH] Token saved to AsyncStorage');
        
        // Verify it was saved
        const savedToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
        console.log('[AUTH] Verified saved token length:', savedToken?.length);
        
        // Update state
        console.log('[AUTH] Setting sessionToken state...');
        setSessionToken(token);
        
        console.log('[AUTH] Setting user state...');
        const newUser = {
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        };
        setUser(newUser);
        console.log('[AUTH] User state set:', newUser.email);
        
        setIsLoading(false);
        console.log('[AUTH] Registration complete, isLoading set to false');
        return { success: true };
      } else {
        console.log('[AUTH] Registration failed:', data.detail);
        setIsLoading(false);
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
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
