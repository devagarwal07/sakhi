import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../api/client';
import { sendOtp, verifyOtp, logout as apiLogout, getProfile } from '../api/endpoints';
import { STORAGE_KEYS } from '../utils/constants';
import { registerForPushAsync } from '../services/notificationService';



async function readCachedUser() {
    try {
        const str = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        return str ? JSON.parse(str) : null;
    } catch {
        return null;
    }
}

async function writeCachedUser(user) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch {}
}

async function deleteCachedUser() {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA).catch(() => {});
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ── Check existing session on app load ─────────────────────────────────
    //
    // Strategy (mirrors driver app):
    //   1. Read token from SecureStore
    //   2. If no token → not authenticated
    //   3. If token exists → show cached user immediately (instant UX)
    //   4. Background-sync fresh profile from server
    //      • Success → update cached user
    //      • 401/403 → real auth rejection → force logout
    //      • Any other error (network, timeout, 5xx) → keep user logged in,
    //        the token refresh interceptor in client.js will handle expiry
    //
    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getAccessToken();

            if (!token) {
                // No token at all — definite logged-out state
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // Token exists — load cached user immediately so the app doesn't
            // stall on a network round-trip before showing the home screen.
            const cachedUser = await readCachedUser();
            if (cachedUser) {
                setUser(cachedUser);
                setIsAuthenticated(true);
                setIsLoading(false); // ← splash hides here; profile sync continues below
            }

            // Background profile sync — refresh from server
            try {
                const { data } = await getProfile();
                const freshUser = data.user ?? data;
                setUser(freshUser);
                setIsAuthenticated(true);
                await writeCachedUser(freshUser);

                if (!cachedUser) {
                    // First launch with no cache — only mark done after fresh profile
                    setIsLoading(false);
                }
            } catch (profileErr) {
                const httpStatus = profileErr?.response?.status;
                const errCode =
                    profileErr?.response?.data?.error?.code ??
                    profileErr?.response?.data?.code;
                // Only treat it as a real auth rejection if the backend
                // explicitly says the token is dead — not a generic proxy 401/403
                // that Render can return during cold starts.
                const isRealAuthRejection =
                    (httpStatus === 401 || httpStatus === 403) &&
                    (errCode === 'UNAUTHORIZED' ||
                     errCode === 'TOKEN_EXPIRED' ||
                     errCode === 'TOKEN_REVOKED');

                console.warn(
                    '[Auth] Profile sync failed:',
                    profileErr?.message,
                    '| status:', httpStatus,
                    '| code:', errCode,
                );

                if (isRealAuthRejection) {
                    // Backend explicitly rejected the session — clear everything
                    await clearTokens();
                    await deleteCachedUser();
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoading(false);
                } else if (!cachedUser) {
                    // Network/server error with no cached user — tokens are likely still valid.
                    // Keep the user authenticated; the refresh interceptor in
                    // client.js will handle TOKEN_EXPIRED on the next API call.
                    setIsAuthenticated(true);
                    setIsLoading(false);
                }
            }
        } catch (err) {
            console.warn('[Auth] checkAuth unexpected error:', err?.message);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // ── Auto-logout when refresh token dies ───────────────────────────────
    // The axios interceptor in client.js fires SESSION_EXPIRED after both the
    // access token AND the refresh token have been rejected. This is the only
    // reliable signal that the session is truly dead.
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('SESSION_EXPIRED', async () => {
            await clearTokens();
            await deleteCachedUser();
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

        if (typeof accessToken !== 'string' || accessToken.length === 0) {
            console.error('[Auth] Invalid accessToken from /auth/verify-otp:', data);
            throw new Error('Login failed: invalid access token from server');
        }
        if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
            console.error('[Auth] Invalid refreshToken from /auth/verify-otp:', data);
            throw new Error('Login failed: invalid refresh token from server');
        }

        await saveTokens(accessToken, refreshToken);
        await writeCachedUser(userData);

        setUser(userData);
        setIsAuthenticated(true);

        // Register FCM token with backend (non-blocking)
        registerForPushAsync().catch((e) =>
            console.warn('[FCM] token registration failed:', e?.message)
        );

        return userData;
    };

    // ── Delete Account ─────────────────────────────────────────────────────
    const deleteUserAccount = async () => {
        const { deleteAccount } = require('../api/endpoints');
        try {
            await deleteAccount();
        } catch (e) {
            console.error('[Auth] deleteAccount failed:', e);
            throw e;
        }
        await clearTokens();
        await deleteCachedUser();
        setUser(null);
        setIsAuthenticated(false);
    };

    // ── Logout ─────────────────────────────────────────────────────────────
    const logout = async () => {
        try {
            await apiLogout();
        } catch {
            // Swallow logout API error — clear locally anyway
        } finally {
            await clearTokens();
            await deleteCachedUser();
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    // ── Update user locally after profile edits ────────────────────────────
    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            const updated = prev ? { ...prev, ...updates } : updates;
            writeCachedUser(updated);
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
