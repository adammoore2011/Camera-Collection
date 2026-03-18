import React from 'react';
import { Tabs, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import AuthCallbackScreen from './auth-callback';

function TabLayoutContent() {
  const { theme } = useTheme();
  const { isLoading } = useAuth();
  const segments = useSegments();
  
  // Check if we're on the auth-callback route
  const isAuthCallback = segments[0] === 'auth-callback';
  
  // Allow auth-callback to be shown without auth check
  if (isAuthCallback) {
    return <AuthCallbackScreen />;
  }
  
  // Show loading while checking auth (brief check on startup)
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  // No login required - app works without authentication
  // Users can sign in from Settings if they want to sync
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: theme.header,
        },
        headerTitleStyle: {
          color: theme.text,
          fontSize: 18,
          fontWeight: 'bold',
        },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Collection',
          headerTitle: 'My Collection',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          headerTitle: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accessories"
        options={{
          title: 'Gear',
          headerTitle: 'Accessories',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          headerTitle: 'Collection Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          headerTitle: 'Add Item',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="camera/[id]"
        options={{
          href: null,
          headerTitle: 'Camera Details',
        }}
      />
      <Tabs.Screen
        name="wishlist-item/[id]"
        options={{
          href: null,
          headerTitle: 'Wishlist Item',
        }}
      />
      <Tabs.Screen
        name="accessory/[id]"
        options={{
          href: null,
          headerTitle: 'Accessory Details',
        }}
      />
      <Tabs.Screen
        name="auth-callback"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          href: null,
          headerTitle: 'Camera Database',
        }}
      />
      <Tabs.Screen
        name="film-stock"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="shooting-log"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TabLayoutContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
