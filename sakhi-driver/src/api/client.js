import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const TOKEN_KEYS = {
  access: 'sakhi_driver_access_token',
  refresh: 'sakhi_driver_refresh_token',
};

export async function getAccessToken() { return SecureStore.getItemAsync(TOKEN_KEYS.access); }
export async function getRefreshToken() { return SecureStore.getItemAsync(TOKEN_KEYS.refresh); }

export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(TOKEN_KEYS.access, accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.refresh, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const DEFAULT_API_URL = 'https://sakhi-backend-pwej.onrender.com';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  timeout: 60000,  // 60s — Render cold start can take up to ~50s
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Render cold-start retry helper
// Render free tier spins down after 15 min of inactivity. The first request
// after idle gets a network error or 502/503 while the server wakes up (~30-50s).
// We retry up to 2 times with a 5-second pause before each retry.
// ---------------------------------------------------------------------------
const COLD_START_RETRIES = 2;
const COLD_START_DELAY_MS = 5000;

function isColdStartError(error) {
  if (!error.response) return true; // network error / no response = server is sleeping
  const { status } = error.response;
  return status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------
client.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — auto-refresh on 401 TOKEN_EXPIRED
// ---------------------------------------------------------------------------
let isRefreshing = false;
let refreshQueue = []; // hold pending requests while refreshing

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── Render cold-start retry ────────────────────────────────────────────
    // If the server is waking up, silently retry up to COLD_START_RETRIES times
    originalRequest._retryCount = originalRequest._retryCount ?? 0;
    if (isColdStartError(error) && originalRequest._retryCount < COLD_START_RETRIES) {
      originalRequest._retryCount += 1;
      await sleep(COLD_START_DELAY_MS);
      return client(originalRequest);
    }

    const is401 = error.response?.status === 401;
    const errBody = error.response?.data?.error ?? error.response?.data;
    const isExpired = errBody?.code === 'TOKEN_EXPIRED';

    if (is401 && isExpired && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        const { data } = await axios.post(
          `${process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL}/auth/refresh-token`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefresh } = data;
        await saveTokens(accessToken, newRefresh);

        client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        // Notify AuthContext to clear state and send user to login
        DeviceEventEmitter.emit('SESSION_EXPIRED');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);


export default client;
