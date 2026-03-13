import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

const iconDark = require('../assets/images/icon-dark.jpg');

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { theme } = useTheme();

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

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={login}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#fff" />
              <Text style={styles.loginButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          Sign in to sync your collection across all your devices
        </Text>
      </View>
    </View>
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
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
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
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
  },
});
