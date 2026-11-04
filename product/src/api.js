// Backend address.
// - Local phone/Expo: use your laptop IP (ipconfig -> Wi-Fi IPv4)
// - Vercel web demo: set EXPO_PUBLIC_API_URL to a public API URL (ngrok / Railway / etc.)
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.2:8000';
