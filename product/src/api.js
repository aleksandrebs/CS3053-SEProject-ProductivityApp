// Backend URL.
// - Local Expo Go on a phone: use your laptop Wi-Fi IP, e.g. http://192.168.x.x:8000
// - Vercel web deploy: set EXPO_PUBLIC_API_URL to your backend's https://....vercel.app
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = (fromEnv && fromEnv.replace(/\/$/, '')) || 'http://127.0.0.1:8000';
