import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../api';

//the login screen saves the access_token from /login or /signup
export const getToken = () => SecureStore.getItemAsync('access_token');

async function request(path, options = {}) {
    const token = await getToken();
    const res = await fetch(API_URL + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
    }
    return res.json();
}

// current balance of the logged-in user
export const getBalance = () => request('/tokens/balance');

// add tokens to the logged-in user's account; returns { token_balance }
export const earnTokens = (amount) =>
    request('/tokens/earn', { method: 'POST', body: JSON.stringify({ amount }) });