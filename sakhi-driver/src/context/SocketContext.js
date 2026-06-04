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
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import apiClient, { getAccessToken } from '../api/client';
import { getRideDetails } from '../api/endpoints';
import { useAuth } from './AuthContext';

// ── Foreground service helpers ────────────────────────────────────────────────
async function startDriverForegroundService() {
  try {
    const channelId = await notifee.createChannel({
      id: 'driver_online',
      name: 'Driver Online',
      importance: AndroidImportance.LOW, // silent persistent notification
      vibration: false,
    });
    await notifee.displayNotification({
      id: 'driver_online_service',
      title: 'Sakhi Driver — You are Online',
      body: 'Waiting for ride requests...',
      android: {
        channelId,
        asForegroundService: true,
        importance: AndroidImportance.LOW,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'notification_icon',
        color: '#BEA3D8',
        pressAction: { id: 'default', launchActivity: 'com.sakhi.partner.driver.MainActivity' },
      },
    });
    console.log('[Notifee] Foreground service started — driver online');
  } catch (err) {
    console.warn('[Notifee] Failed to start foreground service:', err?.message);
  }
}

async function stopDriverForegroundService() {
  try {
    await notifee.stopForegroundService();
    console.log('[Notifee] Foreground service stopped — driver offline');
  } catch (err) {
    console.warn('[Notifee] Failed to stop foreground service:', err?.message);
  }
}

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
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // If a notification tap arrives before AuthContext finishes restoring tokens,
  // queue it and replay once authenticated.
  const pendingPushRideRef = useRef(null);

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

  function normalizeNumber(value) {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function mapPushToIncomingRide(payload) {
    const rideId = payload?.ride_id ?? payload?.rideId ?? payload?.id;
    const pickupLat = normalizeNumber(payload?.pickup_lat ?? payload?.pickupLat);
    const pickupLng = normalizeNumber(payload?.pickup_lng ?? payload?.pickupLng);
    const dropLat = normalizeNumber(payload?.drop_lat ?? payload?.dropLat ?? payload?.dropoff_lat);
    const dropLng = normalizeNumber(payload?.drop_lng ?? payload?.dropLng ?? payload?.dropoff_lng);

    const pickup_coords = (pickupLat != null && pickupLng != null)
      ? { lat: pickupLat, lng: pickupLng }
      : null;
    const dropoff_coords = (dropLat != null && dropLng != null)
      ? { lat: dropLat, lng: dropLng }
      : pickup_coords;

    const estimatedFare = normalizeNumber(payload?.fare ?? payload?.estimated_fare ?? payload?.estimatedFare);
    const distanceKm = normalizeNumber(payload?.distance_km ?? payload?.distanceKm);
    const distanceToPickupKm = normalizeNumber(payload?.distance_to_pickup_km ?? payload?.distanceToPickupKm);
    const etaToPickupMin = normalizeNumber(payload?.eta_to_pickup_min ?? payload?.etaToPickupMin);
    const riderRating = normalizeNumber(payload?.rider_rating ?? payload?.riderRating);
    const dropAddress = payload?.drop_address ?? payload?.dropAddress
      ?? payload?.dropoff_address ?? payload?.dropoffAddress;

    return {
      ride_id: rideId,
      pickup_address: payload?.pickup_address ?? payload?.pickupAddress,
      dropoff_address: dropAddress,
      drop_address: dropAddress,
      pickup_coords,
      dropoff_coords,
      estimated_fare: estimatedFare,
      fare: estimatedFare,
      distance_km: distanceKm,
      distance_to_pickup_km: distanceToPickupKm ?? 0,
      eta_to_pickup_min: etaToPickupMin ?? 0,
      rider_name: payload?.rider_name ?? payload?.riderName,
      rider_photo: payload?.rider_photo ?? payload?.riderPhoto ?? null,
      rider_rating: riderRating ?? 4.5,
      ride_type: payload?.ride_type ?? payload?.rideType,
      is_pre_dispatch: payload?.is_pre_dispatch === 'true' || payload?.is_pre_dispatch === true,
    };
  }

  function mapRideDetailsToIncomingRide(ride, fallbackPayload) {
    if (!ride) return mapPushToIncomingRide(fallbackPayload);
    const pickupLat = normalizeNumber(ride.pickup_lat);
    const pickupLng = normalizeNumber(ride.pickup_lng);
    const dropLat = normalizeNumber(ride.drop_lat);
    const dropLng = normalizeNumber(ride.drop_lng);

    return {
      ride_id: ride.id,
      pickup_address: ride.pickup_address,
      dropoff_address: ride.drop_address,
      drop_address: ride.drop_address,
      pickup_coords: (pickupLat != null && pickupLng != null) ? { lat: pickupLat, lng: pickupLng } : null,
      dropoff_coords: (dropLat != null && dropLng != null) ? { lat: dropLat, lng: dropLng } : null,
      estimated_fare: normalizeNumber(ride.estimated_fare),
      fare: normalizeNumber(ride.estimated_fare),
      distance_km: normalizeNumber(ride.distance_km),
      distance_to_pickup_km: normalizeNumber(fallbackPayload?.distance_to_pickup_km) ?? 0,
      eta_to_pickup_min: normalizeNumber(fallbackPayload?.eta_to_pickup_min) ?? 0,
      rider_name: ride?.users?.name ?? fallbackPayload?.rider_name ?? null,
      rider_photo: ride?.users?.profile_photo_url ?? fallbackPayload?.rider_photo ?? null,
      rider_rating: normalizeNumber(ride?.users?.rating ?? fallbackPayload?.rider_rating) ?? 4.5,
      ride_type: ride?.ride_type ?? fallbackPayload?.ride_type,
    };
  }

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    const token = await getAccessToken();
    if (!token) return;

    const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://sakhi-backend-pwej.onrender.com';

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

  // Join a ride room (required to receive `chat:message` broadcast events)
  const joinRideRoom = useCallback((rideId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        return reject(new Error('Socket not connected'));
      }

      const onJoined = ({ ride_id }) => {
        if (String(ride_id) === String(rideId)) {
          socketRef.current?.off('joined', onJoined);
          socketRef.current?.off('error', onError);
          resolve();
        }
      };

      const onError = (err) => {
        socketRef.current?.off('joined', onJoined);
        socketRef.current?.off('error', onError);
        reject(new Error(err?.message ?? 'Room join failed'));
      };

      socketRef.current.once('joined', onJoined);
      socketRef.current.once('error', onError);
      socketRef.current.emit('driver:join_ride', { ride_id: rideId });

      // Timeout safety: do not block UI indefinitely
      setTimeout(() => {
        socketRef.current?.off('joined', onJoined);
        socketRef.current?.off('error', onError);
        resolve();
      }, 5000);
    });
  }, []);

  const acceptRide = useCallback((ride_id) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (socketRef.current) {
          socketRef.current.emit('ride:accept', { ride_id }, (ack) => {
            if (ack?.success) {
              setIncomingRide(null);
              resolve(ack);
            } else {
              reject(new Error(ack?.message ?? ack?.error ?? 'Accept failed'));
            }
          });
          return;
        }

        await apiClient.post(`/rides/${ride_id}/accept`);
        setIncomingRide(null);
        resolve({ success: true, via: 'rest' });
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const rejectRide = useCallback((ride_id) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (socketRef.current) {
          socketRef.current.emit('ride:reject', { ride_id });
          setIncomingRide(null);
          resolve({ success: true, via: 'socket' });
          return;
        }

        await apiClient.post(`/rides/${ride_id}/reject`);
        setIncomingRide(null);
        resolve({ success: true, via: 'rest' });
      } catch (e) {
        reject(e);
      }
    });
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
      connect().catch(err => console.warn('[Socket] auto-connect error:', err?.message));
      startDriverForegroundService();
    } else {
      disconnect();
      stopDriverForegroundService();
    }
  }, [isAuthenticated, driver?.is_online]);

  // Push tap bridge: App.js emits PUSH_RIDE_REQUEST on notification taps.
  useEffect(() => {
    const processPushRide = async (payload = {}) => {
      const rideId = payload?.ride_id ?? payload?.rideId ?? payload?.id;
      if (!rideId) return;

      // Show overlay immediately from push payload.
      setIncomingRide(mapPushToIncomingRide(payload));

      // Best effort: (re)connect for real-time updates.
      if (driver?.is_online) {
        try { await connect(); } catch (_) { }
      }

      // Enrich with full ride details (coords, addresses, rider name).
      try {
        const response = await getRideDetails(rideId);
        const ride = response?.data;
        setIncomingRide((prev) => {
          if (prev?.ride_id && String(prev.ride_id) !== String(rideId)) return prev;
          return mapRideDetailsToIncomingRide(ride, payload);
        });
      } catch (_) {
        // ignore: best-effort enrichment
      }
    };

    const sub = DeviceEventEmitter.addListener('PUSH_RIDE_REQUEST', (payload = {}) => {
      if (!isAuthenticated) {
        pendingPushRideRef.current = payload;
        return;
      }
      processPushRide(payload);
    });

    return () => sub.remove();
  }, [connect, driver?.is_online, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!pendingPushRideRef.current) return;
    const payload = pendingPushRideRef.current;
    pendingPushRideRef.current = null;
    DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', payload);
  }, [isAuthenticated]);

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
    joinRideRoom,
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
