import { API_URL } from '../api';
import { getItem } from '../storage';

// the login screen saves the access_token from /login or /signup
export const getToken = () => getItem('access_token');

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

// current streak of the logged-in user; returns { current_streak }
export const getStreak = () => request('/streak');

// called when the timer starts so today counts for the streak
export const checkInStreak = () => request('/streak/check-in', { method: 'POST' });

// days the user started the timer; returns { current_streak, days: [{ day }] }
export const getStreakHistory = () => request('/streak/history');

// logged-in user profile from /auth/me
export const getMe = () => request('/auth/me');

// save a new username; returns the updated user
export const updateUsername = (username) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify({ username }) });
