import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// phone uses SecureStore; browser uses localStorage so the web demo works
export async function getItem(key) {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
