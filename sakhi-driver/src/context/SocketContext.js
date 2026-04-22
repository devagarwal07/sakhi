import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { DeviceEventEmitter } from 'react-native';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { useAuth } from './AuthContext';

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

  // ── Pending snoozed subscription requests ─────────────────────────────
  const [pendingSubRequests, setPendingSubRequests] = useState([]);

  // ── Subscription pause / cancel alerts ───────────────────────────────
  // { type: 'paused' | 'cancelled', subscriptionId, customerName, message }
  const [subAlert, setSubAlert] = useState(null);

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    const token = await getAccessToken();
    if (!token) return;

    const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

    const socket = io(`${BASE_URL}/rides`, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('driver:online', { driver_id: driver?.id });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connection error:', err.message);
    });

    // ── Incoming ride request ─────────────────────────────────────────────
    socket.on('ride_request', (rideData) => {
      setIncomingRide(rideData);
    });

    // ── Ride request expired (driver didn't respond in time) ──────────────
    socket.on('ride_request_expired', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
    });

    // ── Ride cancelled before driver decision ─────────────────────────────
    socket.on('ride_cancelled', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
      setPendingSubRequests((prev) => prev.filter((r) => r.ride_id !== ride_id));
    });

    // ── Legacy alias ─────────────────────────────────────────────────────
    socket.on('ride:request_cancelled', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
      setPendingSubRequests((prev) => prev.filter((r) => r.ride_id !== ride_id));
    });

    // ── Subscription paused by customer ──────────────────────────────────
    socket.on('subscription_paused', ({ subscription_id, customer_name }) => {
      setSubAlert({
        type: 'paused',
        subscriptionId: subscription_id,
        customerName: customer_name || 'A customer',
        message: `${customer_name || 'A customer'} has paused their subscription. No rides will be dispatched until they resume.`,
      });
    });

    // ── Subscription cancelled by customer ────────────────────────────────
    socket.on('subscription_cancelled', ({ subscription_id, customer_name }) => {
      setSubAlert({
        type: 'cancelled',
        subscriptionId: subscription_id,
        customerName: customer_name || 'A customer',
        message: `${customer_name || 'A customer'} has cancelled their subscription. This route has been removed from your schedule.`,
      });
      // Also clean up from pending sub requests if it was there
      setPendingSubRequests((prev) =>
        prev.filter((r) => r.subscription_id !== subscription_id)
      );
    });

    // ── Re-register pre-connect listeners ─────────────────────────────────
    Object.entries(listenersRef.current).forEach(([event, handlers]) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });

    socketRef.current = socket;
  }, [driver?.id]);

  // ── Disconnect ─────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.disconnect();
    socketRef.current = null;
    setConnected(false);
    setIncomingRide(null);
  }, []);

  // ── Emit helpers ────────────────────────────────────────────────────────
  const emit = useCallback((event, payload) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const acceptRide = useCallback((ride_id) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit('ride:accept', { ride_id }, (ack) => {
        if (ack?.success) resolve(ack);
        else reject(new Error(ack?.message ?? 'Accept failed'));
      });
    });
  }, []);

  const rejectRide = useCallback((ride_id) => {
    socketRef.current?.emit('ride:reject', { ride_id });
    setIncomingRide(null);
  }, []);

  // ── Snooze subscription request ──────────────────────────────────────────
  // Emits ride:snooze to server (which will re-dispatch to another driver),
  // and saves the ride into pendingSubRequests so the driver sees it on offline.
  const snoozeRide = useCallback((ride_id) => {
    socketRef.current?.emit('ride:snooze', { ride_id });
    setIncomingRide((prev) => {
      if (prev?.ride_id === ride_id) {
        setPendingSubRequests((existing) => {
          const alreadyExists = existing.some((r) => r.ride_id === ride_id);
          return alreadyExists ? existing : [...existing, prev];
        });
        return null;
      }
      return prev;
    });
  }, []);

  const clearPendingSubRequests = useCallback(() => {
    setPendingSubRequests([]);
  }, []);

  // ── Auto-connect while authenticated + online, disconnect on logout ────
  useEffect(() => {
    if (isAuthenticated && driver?.is_online) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, driver?.is_online]);

  // ── Auto-logout on expired session ────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SESSION_EXPIRED', () => {
      disconnect();
    });
    return () => sub.remove();
  }, [disconnect]);

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
    snoozeRide,
    incomingRide,
    clearIncomingRide: () => setIncomingRide(null),
    pendingSubRequests,
    clearPendingSubRequests,
    subAlert,
    clearSubAlert: () => setSubAlert(null),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
