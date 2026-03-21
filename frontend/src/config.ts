import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API URL from environment variables - NO hardcoded URLs
// This allows the app to work across preview, production, and custom domains
export const API_URL = 
  // Try expo config extra (for EAS builds with app.config.js)
  Constants.expoConfig?.extra?.backendUrl ||
  // Try environment variable (works in Expo Go dev and deployment)
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  // Empty fallback - will show error if not configured
  '';

// Session token key for AsyncStorage
export const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

// Device ID key for AsyncStorage (for anonymous users)
export const DEVICE_ID_KEY = '@vintage_camera_device_id';

// Get or generate a unique device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    // First check if we have a stored device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a new device ID
      if (Platform.OS === 'ios') {
        // On iOS, use a combination of identifiers
        deviceId = (Application.applicationId || 'ios') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      } else if (Platform.OS === 'android') {
        // On Android
        deviceId = (Application.applicationId || 'android') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      } else {
        // Web fallback
        deviceId = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      }
      
      // Store it
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Return a temporary ID if storage fails
    return 'temp_' + Date.now().toString(36);
  }
};

// Log the API URL for debugging
console.log('Config - API_URL:', API_URL);
console.log('Config - Constants.appOwnership:', Constants.appOwnership);
console.log('Config - expoConfig.extra:', JSON.stringify(Constants.expoConfig?.extra));
