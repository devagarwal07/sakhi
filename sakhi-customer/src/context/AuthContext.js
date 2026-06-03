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
            // ── Step 1: Check local token (~50ms, instant) ──────────────────
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) {
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Read cached user data — use this immediately so the app renders
            const cachedUserStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
            let cachedUser = null;
            if (cachedUserStr) {
                try { cachedUser = JSON.parse(cachedUserStr); } catch (_) {}
            }

            // Token exists → show home screen immediately with cached data
            if (cachedUser) setUser(cachedUser);
            setIsAuthenticated(true);
            setIsLoading(false); // ← splash hides here

            // ── Step 2: Silently refresh profile in background ──────────────
            // If this fails for ANY reason (network, cold start, timeout), we
            // keep the user logged in with cached data. The interceptor in
            // client.js handles the actual token refresh + SESSION_EXPIRED.
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('auth_timeout')), 15000)
                );
                const { data } = await Promise.race([getProfile(), timeout]);
                const freshUser = data.user || data;
                setUser(freshUser);
                await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(freshUser)).catch(() => {});
            } catch (profileErr) {
                // Network / timeout / cold-start → keep cached user, stay logged in
                // SESSION_EXPIRED event (from client.js interceptor) handles real logouts
                console.warn('[AuthContext] Background profile sync failed — keeping cached session:', profileErr?.message);
            }

        } catch (err) {
            // Outer catch: SecureStore read failed or catastrophic error
            // Still don't log out — just stay with whatever state we have
            console.warn('[AuthContext] checkAuth error:', err?.message);
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
    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            const updated = prev ? { ...prev, ...updates } : updates;
            SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updated)).catch(() => {});
            return updated;
        });
    }, []);

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
