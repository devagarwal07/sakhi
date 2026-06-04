import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
            let token = null;
            try {
                token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            } catch (e) {
                if (!e.message?.includes('User interaction is not allowed')) {
                    console.error('[Auth] Error reading local token:', e);
                }
            }
            if (!token) {
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Read cached user data from AsyncStorage — use this immediately so the app renders
            const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA).catch(() => null);
            let cachedUser = null;
            if (cachedUserStr) {
                try { cachedUser = JSON.parse(cachedUserStr); } catch (_) {}
            }

            // If we have a cached user, show home screen immediately with cached data
            if (cachedUser) {
                setUser(cachedUser);
                setIsAuthenticated(true);
                setIsLoading(false); // ← splash hides here, background sync runs next
            }

            // ── Step 2: Refresh profile (silent if cachedUser exists, blocking if missing)
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('auth_timeout')), 15000)
                );
                const { data } = await Promise.race([getProfile(), timeout]);
                const freshUser = data.user || data;
                setUser(freshUser);
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(freshUser)).catch(() => {});

                if (!cachedUser) {
                    setIsAuthenticated(true);
                    setIsLoading(false);
                }
            } catch (profileErr) {
                console.warn('[AuthContext] Background profile sync failed:', profileErr?.message);
                if (!cachedUser) {
                    // No cache and backend sync failed (network error, timeout, etc.)
                    // Force logout to avoid routing user to wrong screens (like KYC face screen)
                    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
                    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
                    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA).catch(() => {});
                    setIsAuthenticated(false);
                    setUser(null);
                    setIsLoading(false);
                }
            }

        } catch (err) {
            // Outer catch: SecureStore read failed or catastrophic error
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

        const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken, options);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken, options);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)).catch(() => {});

        setUser(userData);
        setIsAuthenticated(true);

        // Register FCM token with backend (non-blocking)
        registerForPushAsync().catch((e) =>
            console.warn('[FCM] token registration failed:', e?.message)
        );

        return userData;
    };

    // ── Delete Account ───────────────────────────────────────────────────────
    const deleteUserAccount = async () => {
        const { deleteAccount } = require('../api/endpoints');
        try {
            await deleteAccount();
        } catch (e) {
            console.error('[Auth] deleteAccount failed:', e);
            throw e; // We want the caller to handle the error UI
        }
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA).catch(() => {});
        setUser(null);
        setIsAuthenticated(false);
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
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA).catch(() => {});
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    // ── Update user locally after profile edits ────────────────────────────
    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            const updated = prev ? { ...prev, ...updates } : updates;
            AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updated)).catch(() => {});
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
        deleteUserAccount,
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
