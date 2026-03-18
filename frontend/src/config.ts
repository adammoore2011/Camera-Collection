import Constants from 'expo-constants';

// Get API URL from expo config (works on mobile) or fallback to env (works on web)
export const API_URL = Constants.expoConfig?.extra?.backendUrl || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://shutter-vault.preview.emergentagent.com';

// Session token key for AsyncStorage
export const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

// Log the API URL for debugging
if (__DEV__) {
  console.log('Config - API_URL:', API_URL);
}
