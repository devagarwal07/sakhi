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
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) {
                setIsAuthenticated(false);
                setUser(null);
                return;
            }
            // Fetch fresh user data (includes verification_status)
            const { data } = await getProfile();
            setUser(data.user || data);
            setIsAuthenticated(true);
        } catch (err) {
            // Token invalid or expired — clear storage
            await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
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
            await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
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
