import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import client, {
  saveTokens,
  clearTokens,
  getAccessToken,
} from '../api/client';

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
  const [isLoading, setIsLoading]         = useState(true);   // true on initial mount
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── checkAuth ────────────────────────────────────────────────────────────
  // Runs on app start. Verifies stored token and loads fresh driver profile.
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
    checkAuth();
  }, [checkAuth]);

  // ─── login ────────────────────────────────────────────────────────────────
  // Verifies OTP with the backend (driver role).
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
  // Call this whenever the driver profile changes locally (e.g., after KYC).
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
