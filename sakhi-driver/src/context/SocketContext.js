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

  // ── Incoming ride request state ────────────────────────────────────────
  const [incomingRide, setIncomingRide] = useState(null);

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    const token = await getAccessToken();
    if (!token) return;

    const socket = io(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000', {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] connected:', socket.id);
      setConnected(true);
      // Announce presence to server
      socket.emit('driver:online', { driver_id: driver?.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connection error:', err.message);
    });

    // ── Incoming ride request ──────────────────────────────────────────
    socket.on('ride:new_request', (rideData) => {
      console.log('[Socket] ride:new_request', rideData.ride_id);
      setIncomingRide(rideData);
    });

    // ── Ride cancelled before decision ────────────────────────────────
    socket.on('ride:request_cancelled', ({ ride_id }) => {
      setIncomingRide((prev) => (prev?.ride_id === ride_id ? null : prev));
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

  // ── Auto-connect while authenticated, disconnect on logout ────────────
  useEffect(() => {
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
    acceptRide,
    rejectRide,
    incomingRide,
    clearIncomingRide: () => setIncomingRide(null),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
