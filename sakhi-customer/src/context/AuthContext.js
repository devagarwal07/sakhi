import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { sendOtp, verifyOtp, logout as apiLogout, getProfile } from '../api/endpoints';
import { STORAGE_KEYS } from '../utils/constants';

// ── DEV BYPASS ─────────────────────────────────────────────────────────────
// Set to `true` to skip OTP & auth entirely during local development.
// ⚠️  MUST be `false` before any production build.
const DEVELOPER_BYPASS = false;

const MOCK_USER = {
    _id: 'dev-user-001',
    name: 'Dev Tester',
    phone: '+919999999999',
    email: 'dev@sakhi.app',
    verification_status: 'verified',
};
// ───────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ── Check existing session on app load ─────────────────────────────────
    const checkAuth = useCallback(async () => {
        if (DEVELOPER_BYPASS) {
            setUser(MOCK_USER);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }
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
        if (DEVELOPER_BYPASS) return { message: '[DEV] OTP bypassed' };
        const { data } = await sendOtp(phone);
        return data;
    };

    // ── Verify OTP + set session ───────────────────────────────────────────
    const login = async (phone, otp) => {
        if (DEVELOPER_BYPASS) {
            setUser(MOCK_USER);
            setIsAuthenticated(true);
            return MOCK_USER;
        }
        const { data } = await verifyOtp(phone, otp);
        const { accessToken, refreshToken, user: userData } = data;

        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

        setUser(userData);
        setIsAuthenticated(true);
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
