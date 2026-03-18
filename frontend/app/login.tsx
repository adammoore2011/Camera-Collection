import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

// Conditionally import Apple Authentication (not available in Expo Go)
let AppleAuthentication: any = null;
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo && Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.log('expo-apple-authentication not available');
  }
}

const iconDark = require('../assets/images/icon-dark.jpg');

type AuthMode = 'welcome' | 'login' | 'register';

export default function LoginScreen() {
  const { login, loginWithEmail, loginWithApple, register, isLoading, isAppleAuthAvailable } = useAuth();
  const { theme } = useTheme();
  
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setError(null);
    setLocalLoading(true);
    
    const result = await loginWithEmail(email, password);
    
    setLocalLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setError(null);
    setLocalLoading(true);
    
    const result = await register(email, password, name);
    
    setLocalLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  };

  const isFormLoading = isLoading || localLoading;

  // Welcome screen
  if (mode === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <Image source={iconDark} style={styles.logo} />
          
          <Text style={[styles.title, { color: theme.text }]}>
            Vintage Camera{'\n'}Collection
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Track and catalogue your vintage cameras, wishlist items, and accessories
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="camera" size={24} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Catalogue your cameras
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="heart" size={24} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Track your wishlist
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sync" size={24} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Sync across devices
              </Text>
            </View>
          </View>

          {/* Email/Password Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => setMode('login')}
          >
            <Ionicons name="mail" size={24} color="#fff" />
            <Text style={styles.buttonText}>Continue with Email</Text>
          </TouchableOpacity>

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color={theme.text} />
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple Sign-In Button - Only shown on iOS native builds, not Expo Go */}
          {Platform.OS === 'ios' && AppleAuthentication && isAppleAuthAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={async () => {
                setError(null);
                const result = await loginWithApple();
                if (!result.success) {
                  setError(result.error || 'Apple Sign-In failed');
                }
              }}
            />
          )}

          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            Sign in to sync your collection across all your devices
          </Text>
        </View>
      </View>
    );
  }

  // Login / Register form
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setMode('welcome');
            setError(null);
            setEmail('');
            setPassword('');
            setName('');
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <Image source={iconDark} style={styles.logoSmall} />
        
        <Text style={[styles.formTitle, { color: theme.text }]}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </Text>
        
        <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
          {mode === 'login' 
            ? 'Sign in to access your collection' 
            : 'Start cataloguing your cameras today'}
        </Text>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {mode === 'register' && (
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isFormLoading}
              />
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isFormLoading}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isFormLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={mode === 'login' ? handleEmailLogin : handleRegister}
          disabled={isFormLoading}
        >
          {isFormLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchModeContainer}>
          <Text style={[styles.switchModeText, { color: theme.textSecondary }]}>
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            disabled={isFormLoading}
          >
            <Text style={[styles.switchModeLink, { color: theme.primary }]}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={login}
          disabled={isFormLoading}
        >
          <Ionicons name="logo-google" size={20} color={theme.text} />
          <Text style={[styles.googleButtonText, { color: theme.text }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
  },
  logoSmall: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  formSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  features: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchModeText: {
    fontSize: 14,
  },
  switchModeLink: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginTop: 16,
  },
});
