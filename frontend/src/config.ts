// API URL - hardcoded for mobile compatibility
// On web, process.env works. On mobile, we use the hardcoded fallback.
export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://shutter-vault.preview.emergentagent.com';

// Session token key for AsyncStorage
export const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

// Log the API URL for debugging
console.log('Config - API_URL:', API_URL);
