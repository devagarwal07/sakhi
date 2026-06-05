import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import CustomAlert from '../utils/CustomAlert';

// ---------------------------------------------------------------------------
// Token helpers — aligned with driver app client.js pattern
// ---------------------------------------------------------------------------
export const TOKEN_KEYS = {
    access: STORAGE_KEYS.ACCESS_TOKEN,
    refresh: STORAGE_KEYS.REFRESH_TOKEN,
};

export async function getAccessToken() {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEYS.access);
    } catch (e) {
        if (!e.message?.includes('User interaction is not allowed')) {
            console.error('[API Client] Error reading access token:', e);
        }
        return null;
    }
}

export async function getRefreshToken() {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
    } catch (e) {
        if (!e.message?.includes('User interaction is not allowed')) {
            console.error('[API Client] Error reading refresh token:', e);
        }
        return null;
    }
}

export async function saveTokens(accessToken, refreshToken) {
    const secureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
    await SecureStore.setItemAsync(TOKEN_KEYS.access, accessToken, secureStoreOptions);
    await SecureStore.setItemAsync(TOKEN_KEYS.refresh, refreshToken, secureStoreOptions);
}

export async function clearTokens() {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.access).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh).catch(() => {});
}

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,  // 60s — Render cold start can take up to ~50s
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// ---------------------------------------------------------------------------
// Render cold-start retry helper
// ---------------------------------------------------------------------------
const COLD_START_RETRIES = 2;
const COLD_START_DELAY_MS = 5000;

function isColdStartError(error) {
    if (!error.response) return true; // no response = server sleeping
    const { status } = error.response;
    return status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Request Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await getAccessToken();
            if (token) {
                if (config.headers && typeof config.headers.set === 'function') {
                    config.headers.set('Authorization', `Bearer ${token}`);
                } else {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (e) {
            console.error('[API Client] Error attaching authorization header:', e);
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response Interceptor — Token Refresh ───────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // ── Global Error UI ─────────────────────────────────────────────────
        if (error.response?.status === 429) {
            CustomAlert.alert('Too Many Requests', 'Please wait a moment before trying again.');
        } else if (error.response?.status >= 500 && error.response?.status !== 502 && error.response?.status !== 503 && error.response?.status !== 504) {
            CustomAlert.alert('Server Error', 'Our servers are experiencing issues. Please try again later.');
        }

        // ── Render cold-start retry ─────────────────────────────────────────
        originalRequest._retryCount = originalRequest._retryCount ?? 0;
        if (isColdStartError(error) && originalRequest._retryCount < COLD_START_RETRIES) {
            originalRequest._retryCount += 1;
            await sleep(COLD_START_DELAY_MS);
            return apiClient(originalRequest);
        }

        // ── Token Refresh — only attempt if backend explicitly says TOKEN_EXPIRED ──
        // (Matching driver app pattern: don't burn the refresh token on a plain
        //  UNAUTHORIZED rejection, which means the token is already dead/revoked)
        const is401 = error.response?.status === 401;
        const errCode = error.response?.data?.error?.code ?? error.response?.data?.code;
        const isTokenExpired = errCode === 'TOKEN_EXPIRED';

        if (
            is401 &&
            isTokenExpired &&
            !originalRequest._retry
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token');

                let response;
                let refreshRetryCount = 0;
                while (true) {
                    try {
                        response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                            refreshToken,
                        });
                        break;
                    } catch (err) {
                        if (isColdStartError(err) && refreshRetryCount < COLD_START_RETRIES) {
                            refreshRetryCount += 1;
                            await sleep(COLD_START_DELAY_MS);
                        } else {
                            throw err;
                        }
                    }
                }

                const { accessToken, refreshToken: newRefresh } = response.data;
                if (typeof accessToken !== 'string' || accessToken.length === 0) {
                    console.error('[Auth] Invalid accessToken from /auth/refresh-token:', response.data);
                    throw new Error('Session refresh failed: invalid access token from server');
                }
                if (typeof newRefresh !== 'string' || newRefresh.length === 0) {
                    console.error('[Auth] Invalid refreshToken from /auth/refresh-token:', response.data);
                    throw new Error('Session refresh failed: invalid refresh token from server');
                }
                
                await saveTokens(accessToken, newRefresh);

                apiClient.defaults.headers.Authorization = `Bearer ${accessToken}`;
                processQueue(null, accessToken);

                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Clear ALL local auth state — AuthContext listener will handle logout navigation
                await clearTokens();
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
                } catch (_) {}
                // Notify the app to log the user out and redirect to login
                DeviceEventEmitter.emit('SESSION_EXPIRED');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default apiClient;
