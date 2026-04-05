import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { DeviceEventEmitter } from 'react-native';

import client, {
  saveTokens,
  clearTokens,
  getAccessToken,
} from '../api/client';

/** Map GET /drivers/profile (flat) and verify-otp `driver` to app driver shape */
function normalizeDriver(raw) {
  if (!raw) return null;
  const d = raw.driver ?? raw;
  if (!d || !d.id) return null;
  const onboarding_status =
    d.verification_status === 'approved' ? 'approved'
      : d.verification_status === 'rejected' ? 'rejected'
        : d.onboarding_status ?? 'pending';
  return { ...d, onboarding_status };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [driver, setDriver]               = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── checkAuth ────────────────────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        setDriver(null);
        return;
      }

      const { data } = await client.get('/drivers/profile');
      setDriver(normalizeDriver(data));
      setIsAuthenticated(true);
    } catch {
      // Token invalid / network error → force logout
      await clearTokens();
      setDriver(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ── Auto-logout when session expires (refresh token dead) ─────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SESSION_EXPIRED', () => {
      setDriver(null);
      setIsAuthenticated(false);
    });
    return () => sub.remove();
  }, []);

  // ─── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (phone, otp) => {
    setIsLoading(true);
    try {
      const { data } = await client.post('/auth/verify-otp', {
        phone,
        otp,
        role: 'driver',
      });

      const { accessToken, refreshToken, driver: driverData } = data;
      await saveTokens(accessToken, refreshToken);

      setDriver(normalizeDriver(driverData));
      setIsAuthenticated(true);
      return { success: true, driver: driverData };
    } catch (error) {
      const message =
        error.response?.data?.error?.message
        ?? error.response?.data?.message
        ?? 'Invalid OTP. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Ignore — clear local tokens regardless
    } finally {
      await clearTokens();
      setDriver(null);
      setIsAuthenticated(false);
    }
  }, []);

  // ─── updateDriver ─────────────────────────────────────────────────────────
  const updateDriver = useCallback((updates) => {
    setDriver((prev) => (prev ? { ...prev, ...updates } : updates));
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = {
    driver,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    updateDriver,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
