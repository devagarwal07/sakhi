import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const TOKEN_KEYS = {
  access:  'sakhi_driver_access_token',
  refresh: 'sakhi_driver_refresh_token',
};

export async function getAccessToken()  { return SecureStore.getItemAsync(TOKEN_KEYS.access);  }
export async function getRefreshToken() { return SecureStore.getItemAsync(TOKEN_KEYS.refresh); }

export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(TOKEN_KEYS.access,  accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.refresh, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

    const is401 = error.response?.status === 401;
    const isExpired = error.response?.data?.code === 'TOKEN_EXPIRED';

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
          `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/refresh-token`,
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
        // AuthContext will detect missing token and logout
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default client;
