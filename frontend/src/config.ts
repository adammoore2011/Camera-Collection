import Constants from 'expo-constants';

// Production API URL - MUST be hardcoded for App Store builds
// Expo Go uses process.env, but production builds need this hardcoded value
const PRODUCTION_API_URL = 'https://shutter-vault.preview.emergentagent.com';

// Get API URL with multiple fallbacks for different environments
export const API_URL = 
  // Try expo config extra (for EAS builds with app.config.js)
  Constants.expoConfig?.extra?.backendUrl ||
  // Try environment variable (works in Expo Go dev)
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  // Hardcoded fallback for production
  PRODUCTION_API_URL;

// Session token key for AsyncStorage
export const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

// Log the API URL for debugging
console.log('Config - API_URL:', API_URL);
console.log('Config - Constants.appOwnership:', Constants.appOwnership);
console.log('Config - expoConfig.extra:', JSON.stringify(Constants.expoConfig?.extra));
