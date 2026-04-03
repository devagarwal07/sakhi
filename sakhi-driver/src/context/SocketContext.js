import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { useAuth } from './AuthContext';
import { DEV_BYPASS_AUTH } from '../utils/constants';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SocketContext = createContext(null);

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function SocketProvider({ children }) {
  const { isAuthenticated, driver } = useAuth();
  const socketRef  = useRef(null);
  const [connected, setConnected] = useState(false);

  // ── Generic event listeners (for useSocketEvent hook) ─────────────────────
  const listenersRef = useRef({}); // { [eventName]: Set<handler> }

  const on = useCallback((event, handler) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = new Set();
    }
    listenersRef.current[event].add(handler);
    // Also register on the live socket if already connected
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    listenersRef.current[event]?.delete(handler);
    socketRef.current?.off(event, handler);
  }, []);

  // ── Incoming ride request state ────────────────────────────────────────
  const [incomingRide, setIncomingRide] = useState(null);

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    // Skip real socket connection in dev bypass mode
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV] SocketProvider — skipping connection in bypass mode');
      return;
    }

    if (socketRef.current?.connected) return;

    const token = await getAccessToken();
    if (!token) return;

    const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

    const socket = io(`${BASE_URL}/rides`, {   // ← /rides namespace (where driver rooms live)
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] connected to /rides namespace:', socket.id);
      setConnected(true);
      // Announce presence — joins driver:<id> room server-side automatically
      socket.emit('driver:online', { driver_id: driver?.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connection error:', err.message);
    });

    // ── Incoming ride request (matchingEngine emits 'ride_request') ──────────
    socket.on('ride_request', (rideData) => {
      console.log('[Socket] ride_request received', rideData.ride_id);
      setIncomingRide(rideData);
    });

    // ── Ride request expired (driver didn't respond in time) ─────────────────
    socket.on('ride_request_expired', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
    });

    // ── Ride cancelled before driver decision ─────────────────────────────────
    socket.on('ride_cancelled', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
    });

    // ── Legacy alias (keep for safety) ──────────────────────────────────────
    socket.on('ride:request_cancelled', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
    });

    socketRef.current = socket;
  }, [driver?.id]);

  // ── Disconnect ─────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (DEV_BYPASS_AUTH) return; // no-op in dev mode
    if (!socketRef.current) return;
    socketRef.current.disconnect();
    socketRef.current = null;
    setConnected(false);
    setIncomingRide(null);
  }, []);

  // ── Emit helpers ────────────────────────────────────────────────────────
  const emit = useCallback((event, payload) => {
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV Socket] emit:', event, payload);
      return;
    }
    socketRef.current?.emit(event, payload);
  }, []);

  const acceptRide = useCallback((ride_id) => {
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV Socket] acceptRide:', ride_id);
      return Promise.resolve({ success: true });
    }
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit('ride:accept', { ride_id }, (ack) => {
        if (ack?.success) resolve(ack);
        else reject(new Error(ack?.message ?? 'Accept failed'));
      });
    });
  }, []);

  const rejectRide = useCallback((ride_id) => {
    if (DEV_BYPASS_AUTH) {
      console.log('[DEV Socket] rejectRide:', ride_id);
      setIncomingRide(null);
      return;
    }
    socketRef.current?.emit('ride:reject', { ride_id });
    setIncomingRide(null);
  }, []);

  // ── DEV: simulate an incoming ride request (useful for UI testing) ────────
  const simulateRide = useCallback(() => {
    setIncomingRide({
      ride_id: `DEV_${Date.now()}`,
      rider_name: 'Priya Sharma',
      rider_photo: null,
      rider_rating: 4.8,
      fare: 124,
      pickup_address: 'Versova Metro Station, Mumbai',
      dropoff_address: 'Andheri West, JVLR Corner',
      distance_to_pickup_km: 2.1,
      eta_to_pickup_min: 4,
      pickup_coords:  { latitude: 19.1136, longitude: 72.8270 },
      dropoff_coords: { latitude: 19.1197, longitude: 72.8468 },
    });
  }, []);

  // ── Auto-connect while authenticated, disconnect on logout ────────────
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return; // skip in dev mode

    if (isAuthenticated && driver?.is_online) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      // Don't disconnect on re-render — only on explicit offline/logout
    };
  }, [isAuthenticated, driver?.is_online]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => () => disconnect(), []);

  const value = {
    socket: socketRef.current,
    connected,
    connect,
    disconnect,
    emit,
    on,
    off,
    acceptRide,
    rejectRide,
    simulateRide,
    incomingRide,
    clearIncomingRide: () => setIncomingRide(null),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
