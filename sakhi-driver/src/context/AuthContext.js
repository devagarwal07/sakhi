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
import { registerForPushAsync } from '../services/notificationService';
import { DEV_BYPASS_AUTH } from '../utils/constants';


/** Map GET /drivers/profile (flat) and verify-otp `driver` to app driver shape */
function normalizeDriver(raw) {
  if (!raw) return null;
  const d = raw.driver ?? raw;
  if (!d || !d.id) return null;
  // Use the DB onboarding_status directly as the source of truth.
  // 'approved' is only set when an admin explicitly approves the driver.
  const onboarding_status = d.onboarding_status ?? 'pending';
  return { ...d, onboarding_status };
}

// ---------------------------------------------------------------------------
// DEV BYPASS — for local UI testing only.
// Prefer backend OTP bypass (`OTP_BYPASS_CODE`) when you want a fixed OTP.
// ---------------------------------------------------------------------------
const DEVELOPER_BYPASS = DEV_BYPASS_AUTH;

const MOCK_DRIVER = {
  id: 'dev-driver-001',
  name: 'Dev Driver',
  phone: '+919999999999',
  email: 'dev@sakhi.app',
  onboarding_status: 'approved',        // lands straight in main stack
  verification_status: 'approved',
  kyc_status: 'verified',
  aadhaar_status: 'verified',
  driving_licence_status: 'verified',
  vehicle_rc_status: 'verified',
  vehicle_type: 'auto',
  vehicle_reg_no: 'UP20AB1234',
  avg_rating: 4.8,
  total_rides: 42,
  is_active: true,
  is_online: false,
};
// ---------------------------------------------------------------------------

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
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── checkAuth ────────────────────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    if (DEVELOPER_BYPASS) {
      setDriver(MOCK_DRIVER);
      setIsAuthenticated(true);
      setIsLoading(false);
      // Still register FCM token so push notifications work during dev testing
      registerForPushAsync().catch((e) =>
        console.warn('[FCM] token registration failed (dev bypass):', e?.message)
      );
      return;
    }
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
    const subRefresh = DeviceEventEmitter.addListener('REFRESH_AUTH', () => {
      checkAuth();
    });
    return () => {
      sub.remove();
      subRefresh.remove();
    };
  }, [checkAuth]);

  // ─── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (phone, otp) => {
    if (DEVELOPER_BYPASS) {
      setDriver(MOCK_DRIVER);
      setIsAuthenticated(true);
      return { success: true, driver: MOCK_DRIVER };
    }
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

      // Register FCM token with backend (non-blocking)
      registerForPushAsync().catch((e) =>
        console.warn('[FCM] token registration failed:', e?.message)
      );

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
    if (DEVELOPER_BYPASS) {
      setDriver(null);
      setIsAuthenticated(false);
      return;
    }
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
