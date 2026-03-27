import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { sendOtp, verifyOtp, logout as apiLogout, getProfile } from '../api/endpoints';
import { STORAGE_KEYS, DEV_BYPASS_AUTH } from '../utils/constants';

// ── Mock user for dev/UI testing ──────────────────────────────────────────
const MOCK_USER = {
    id: 'dev-user-001',
    name: 'Dev User',
    phone: '+91 9999999999',
    email: 'dev@sakhi.app',
    avatar: null,
    verification_status: 'approved',  // skip KYC flow
    wallet_balance: 250.00,
    rating: 4.8,
    total_rides: 42,
    created_at: new Date().toISOString(),
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(DEV_BYPASS_AUTH ? MOCK_USER : null);
    const [isLoading, setIsLoading] = useState(!DEV_BYPASS_AUTH);
    const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS_AUTH);

    // ── Check existing session on app load ─────────────────────────────────
    const checkAuth = useCallback(async () => {
        // In dev bypass mode, always return the mock user instantly
        if (DEV_BYPASS_AUTH) {
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
        if (!DEV_BYPASS_AUTH) {
            checkAuth();
        }
    }, [checkAuth]);

    // ── Send OTP ───────────────────────────────────────────────────────────
    const requestOtp = async (phone) => {
        if (DEV_BYPASS_AUTH) {
            console.log('[DEV] requestOtp skipped for:', phone);
            return { message: 'OTP sent (dev mock)' };
        }
        const { data } = await sendOtp(phone);
        return data;
    };

    // ── Verify OTP + set session ───────────────────────────────────────────
    const login = async (phone, otp) => {
        if (DEV_BYPASS_AUTH) {
            console.log('[DEV] login skipped — using mock user');
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
        if (DEV_BYPASS_AUTH) {
            console.log('[DEV] logout skipped in bypass mode');
            return;
        }
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
