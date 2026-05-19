import { useEffect } from 'react';
import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';

const { RideRequestBridge } = NativeModules;

/**
 * useRideRequestBridge
 *
 * Reads ride payload written by IncomingRideActivity via SharedPreferences.
 * Called on every app mount / foreground resume.
 *
 * When IncomingRideActivity is the entry point (fullscreen intent):
 *   1. IncomingRideActivity writes payload → SharedPreferences ("SakhiRideBridge")
 *   2. IncomingRideActivity brings MainActivity to front
 *   3. App mounts → this hook fires → reads payload → emits PUSH_RIDE_REQUEST
 *   4. SocketContext picks it up → sets incomingRide → overlay appears
 *
 * This fires in both fresh launches AND re-activations (app in background).
 */
export function useRideRequestBridge() {
  useEffect(() => {
    if (Platform.OS !== 'android' || !RideRequestBridge) return;

    let cancelled = false;

    const check = async () => {
      try {
        const payload = await RideRequestBridge.getPendingRideRequest();
        if (cancelled || !payload) return;

        if (payload.type === 'RIDE_REQUEST') {
          console.log('[RideRequestBridge] Found pending ride from IncomingRideActivity:', payload.type, 'action:', payload._action);
          // If the driver tapped the Accept button, mark it so SocketContext
          // can auto-accept without waiting for the overlay button press
          DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', { ...payload });
        }
      } catch (err) {
        console.warn('[RideRequestBridge] Error reading pending ride:', err?.message);
      }
    };

    // Small delay to let React hydrate before the overlay triggers
    const t = setTimeout(check, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);
}
