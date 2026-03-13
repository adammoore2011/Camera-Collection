import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, themes, ThemeName } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';

const iconPink = require('../assets/images/icon-pink.jpg');
const iconBlue = require('../assets/images/icon-blue.jpg');
const iconBrown = require('../assets/images/icon-brown.jpg');
const iconDark = require('../assets/images/icon-dark.jpg');

type IconKey = 'pink' | 'blue' | 'brown' | 'dark';

const iconOptions: { key: IconKey; label: string; image: any }[] = [
  { key: 'pink', label: 'Blush', image: iconPink },
  { key: 'blue', label: 'Sky', image: iconBlue },
  { key: 'brown', label: 'Sepia', image: iconBrown },
  { key: 'dark', label: 'Slate', image: iconDark },
];

export default function SettingsScreen() {
  const { theme, themeName, setThemeName, appIcon, setAppIcon } = useTheme();
  const { user, logout } = useAuth();

  const themeOptions: { key: ThemeName; description: string }[] = [
    { key: 'dark', description: 'Classic dark mode' },
    { key: 'light', description: 'Clean and bright' },
    { key: 'retro', description: 'Warm vintage tones' },
    { key: 'bright', description: 'Vibrant and modern' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Section */}
      {user && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          </View>
          
          <View style={styles.accountInfo}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{user.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
            <View style={styles.accountDetails}>
              <Text style={[styles.accountName, { color: theme.text }]}>{user.name}</Text>
              <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>{user.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.error }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* App Icon Section */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="image" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>App Icon</Text>
        </View>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Choose your preferred app icon style
        </Text>
        
        <View style={styles.iconGrid}>
          {iconOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.iconOption,
                { backgroundColor: theme.surfaceLight },
                appIcon === option.key && { borderColor: theme.primary, borderWidth: 3 },
              ]}
              onPress={() => setAppIcon(option.key)}
            >
              <Image source={option.image} style={styles.iconImage} />
              <Text style={[styles.iconLabel, { color: theme.text }]}>{option.label}</Text>
              {appIcon === option.key && (
                <View style={[styles.selectedBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Scheme Section */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Color Scheme</Text>
        </View>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Personalize the look of your app
        </Text>
        
        <View style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const optionTheme = themes[option.key];
            const isSelected = themeName === option.key;
            
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.themeOption,
                  { backgroundColor: theme.surfaceLight },
                  isSelected && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => setThemeName(option.key)}
              >
                <View style={styles.themePreview}>
                  <View style={[styles.previewBg, { backgroundColor: optionTheme.background }]}>
                    <View style={[styles.previewSurface, { backgroundColor: optionTheme.surface }]} />
                    <View style={[styles.previewAccent, { backgroundColor: optionTheme.primary }]} />
                  </View>
                </View>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { color: theme.text }]}>
                    {optionTheme.name}
                  </Text>
                  <Text style={[styles.themeDescription, { color: theme.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* About Section */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        </View>
        
        <View style={styles.aboutContent}>
          <View style={[styles.aboutRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>App Name</Text>
            <Text style={[styles.aboutValue, { color: theme.text }]}>Vintage Camera Collection</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>Current Theme</Text>
            <Text style={[styles.aboutValue, { color: theme.primary }]}>{theme.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  accountDetails: {
    marginLeft: 16,
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: '47%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  iconImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  themePreview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewBg: {
    flex: 1,
    padding: 6,
  },
  previewSurface: {
    flex: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  previewAccent: {
    height: 8,
    borderRadius: 4,
  },
  themeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  themeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    marginTop: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100,
  },
});
