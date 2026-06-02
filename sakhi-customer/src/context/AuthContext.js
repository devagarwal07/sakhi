import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { sendOtp, verifyOtp, logout as apiLogout, getProfile } from '../api/endpoints';
import { STORAGE_KEYS } from '../utils/constants';
import { registerForPushAsync } from '../services/notificationService';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ── Check existing session on app load ─────────────────────────────────
    const checkAuth = useCallback(async () => {
        setIsLoading(true);

        try {
            // ── Step 1: Check local token (near-instant, ~50ms) ─────────────────
            // Hide splash as soon as we know whether user is logged in or not.
            // We do NOT wait for the network profile fetch before hiding splash.
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) {
                // No token → go to login. Splash hidden immediately.
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Read cached user data so routing has the correct verification status immediately
            const cachedUserStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
            if (cachedUserStr) {
                try {
                    setUser(JSON.parse(cachedUserStr));
                } catch (e) {
                    // ignore parse error
                }
            }

            // Token exists → optimistically mark as authenticated so the home
            // screen renders immediately (splash hides). Profile will load below.
            setIsAuthenticated(true);
            setIsLoading(false); // ← splash hides here, not after API call

            // ── Step 2: Fetch fresh profile in background ─────────────────────
            // A 15s timeout prevents hanging if backend is slow/cold starting.
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('auth_timeout')), 15000)
            );
            const { data } = await Promise.race([getProfile(), timeout]);
            
            const freshUser = data.user || data;
            setUser(freshUser);
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(freshUser)).catch(() => {});

        } catch (err) {
            // ONLY log out and clear storage if the API specifically rejected the token (401 Unauthorized / 403 Forbidden)
            const isAuthError = err?.isAxiosError 
                ? (err.response?.status === 401 || err.response?.status === 403)
                : false;
            
            if (isAuthError) {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
                await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
                setIsAuthenticated(false);
                setUser(null);
            } else {
                console.warn('[AuthContext] getProfile background sync failed (non-auth error):', err?.message);
                DeviceEventEmitter.emit('SHOW_CUSTOM_ALERT', {
                    title: 'Sync Warning',
                    message: 'We could not refresh your profile data due to a slow connection. You may be viewing outdated information. Please check your internet.',
                    buttons: [{ text: 'Got it', style: 'cancel' }],
                });
            }
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // ── Auto-logout when session expires (refresh token dead) ──────────────
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('SESSION_EXPIRED', () => {
            setUser(null);
            setIsAuthenticated(false);
        });
        return () => sub.remove();
    }, []);

    // ── Send OTP ───────────────────────────────────────────────────────────
    const requestOtp = async (phone) => {
        const { data } = await sendOtp(phone);
        return data;
    };

    // ── Verify OTP + set session ───────────────────────────────────────────
    const login = async (phone, otp) => {
        const { data } = await verifyOtp(phone, otp);
        const { accessToken, refreshToken, user: userData } = data;

        // SecureStore requires string values. If tokens are missing/invalid, fail fast
        // with a clear error rather than throwing the SecureStore type error.
        if (typeof accessToken !== 'string' || accessToken.length === 0) {
            console.error('[Auth] Invalid accessToken from /auth/verify-otp:', data);
            throw new Error('Login failed: invalid access token from server');
        }
        if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
            console.error('[Auth] Invalid refreshToken from /auth/verify-otp:', data);
            throw new Error('Login failed: invalid refresh token from server');
        }

        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)).catch(() => {});

        setUser(userData);
        setIsAuthenticated(true);

        // Register FCM token with backend (non-blocking)
        registerForPushAsync().catch((e) =>
            console.warn('[FCM] token registration failed:', e?.message)
        );

        return userData;
    };

    // ── Logout ─────────────────────────────────────────────────────────────
    const logout = async () => {
        try {
            await apiLogout();
        } catch (_) {
            // Swallow logout API error — clear locally anyway
        } finally {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
            await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    // ── Update user locally after profile edits ────────────────────────────
    const updateUser = (updates) => {
        setUser((prev) => ({ ...prev, ...updates }));
    };

    const value = {
        user,
        isLoading,
        isAuthenticated,
        requestOtp,
        login,
        logout,
        updateUser,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
