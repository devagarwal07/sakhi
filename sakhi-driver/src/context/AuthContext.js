import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import client, {
  saveTokens,
  clearTokens,
  getAccessToken,
} from '../api/client';

import { DEV_BYPASS_AUTH } from '../utils/constants';

// ---------------------------------------------------------------------------
// Mock driver — used when DEV_BYPASS_AUTH = true
// ---------------------------------------------------------------------------
const MOCK_DRIVER = {
  id: 'dev-driver-001',
  name: 'Dev Driver',
  phone: '+91 8888888888',
  email: 'dev.driver@sakhi.app',
  avatar: null,
  gender: 'male',
  onboarding_status: 'approved',   // skips onboarding stack
  is_online: false,                 // start offline; toggle from home screen
  rating: 4.7,
  total_rides: 128,
  wallet_balance: 1250.00,
  vehicle: {
    type: 'auto',
    make: 'Bajaj',
    model: 'RE',
    color: 'Yellow',
    plate: 'DL 01 AB 1234',
    year: 2022,
  },
  created_at: new Date().toISOString(),
};

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
  const [driver, setDriver]               = useState(DEV_BYPASS_AUTH ? MOCK_DRIVER : null);
  const [isLoading, setIsLoading]         = useState(false);   // no loading flash in dev
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS_AUTH);

  // ─── checkAuth ────────────────────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    // In dev bypass mode, return mock driver instantly
    if (DEV_BYPASS_AUTH) {
      setDriver(MOCK_DRIVER);
      setIsAuthenticated(true);
      setIsLoading(false);
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
      setDriver(data.driver);
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
    if (!DEV_BYPASS_AUTH) {
      checkAuth();
    }
  }, [checkAuth]);

  // ─── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (phone, otp) => {
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV] login skipped — using mock driver');
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

      setDriver(driverData);
      setIsAuthenticated(true);
      return { success: true, driver: driverData };
    } catch (error) {
      const message =
        error.response?.data?.message ?? 'Invalid OTP. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV] logout skipped in bypass mode');
      return;
    }
    try {
      await client.post('/auth/logout');
    } catch {
      // Ignore—clear local tokens regardless
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
