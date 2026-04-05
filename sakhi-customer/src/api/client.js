import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// ── Request Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

        if (
            error.response?.status === 401 &&
            (error.response?.data?.code === 'TOKEN_EXPIRED' || error.response?.data?.error?.code === 'TOKEN_EXPIRED') &&
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
                const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefresh } = response.data;
                await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
                await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);

                apiClient.defaults.headers.Authorization = `Bearer ${accessToken}`;
                processQueue(null, accessToken);

                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Clear tokens — AuthContext listener will handle logout navigation
                await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
                await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default apiClient;
