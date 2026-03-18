import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/contexts/ThemeContext';
import { API_URL, SESSION_TOKEN_KEY } from '../src/config';

export default function AuthCallbackScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing login...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL to extract session_id from fragment
        const url = await Linking.getInitialURL();
        console.log('Auth callback URL:', url);
        console.log('Params:', params);

        let sessionId: string | null = null;

        // Try to get session_id from URL fragment (hash)
        if (url && url.includes('session_id=')) {
          sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        }

        // Also check params (for query string format)
        if (!sessionId && params.session_id) {
          sessionId = Array.isArray(params.session_id) ? params.session_id[0] : params.session_id;
        }

        console.log('Extracted session ID:', sessionId);

        if (!sessionId) {
          setStatus('error');
          setMessage('No session ID found. Please try logging in again.');
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        // Exchange session_id for session token
        setMessage('Verifying credentials...');
        
        const response = await fetch(`${API_URL}/api/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('User authenticated:', userData?.email);

          // Extract token from cookies or use session_id
          const cookies = response.headers.get('set-cookie');
          let token = sessionId;
          
          if (cookies && cookies.includes('session_token=')) {
            const match = cookies.match(/session_token=([^;]+)/);
            if (match) {
              token = match[1];
            }
          }

          // Store the token
          await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
          
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          
          // Redirect to home after a brief moment
          setTimeout(() => {
            router.replace('/');
          }, 1000);
        } else {
          console.error('Session exchange failed:', response.status);
          setStatus('error');
          setMessage('Login failed. Please try again.');
          setTimeout(() => router.replace('/login'), 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
        setTimeout(() => router.replace('/login'), 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {status === 'processing' && (
          <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
        )}
        
        {status === 'success' && (
          <View style={[styles.iconContainer, { backgroundColor: theme.success + '20' }]}>
            <Text style={styles.icon}>✓</Text>
          </View>
        )}
        
        {status === 'error' && (
          <View style={[styles.iconContainer, { backgroundColor: theme.error + '20' }]}>
            <Text style={styles.icon}>✕</Text>
          </View>
        )}
        
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
  },
  spinner: {
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 30,
    color: '#fff',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});
