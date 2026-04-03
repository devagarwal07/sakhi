import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

/**
 * Returns the driver's current location and continuously watches it.
 * Cleans up the subscription automatically on unmount.
 *
 * Returns: { location, error, loading, stopWatching }
 *   - location: { latitude, longitude, accuracy } | null
 *   - error: string | null (e.g., 'Location permission denied')
 *   - loading: bool — true until first fix received
 *   - stopWatching: () => void — call to pause tracking manually
 */
export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const watcherRef = useRef(null);

  const stopWatching = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mounted) setError('Location permission denied');
        setLoading(false);
        return;
      }

      // Quick initial fix
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          setLocation({
            latitude:  initial.coords.latitude,
            longitude: initial.coords.longitude,
            accuracy:  initial.coords.accuracy,
          });
          setLoading(false);
        }
      } catch {
        // Position might fail on emulator; continue to watcher
        if (mounted) setLoading(false);
      }

      // Continuous high-accuracy watch
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.High,
          distanceInterval: 10,   // metres between updates
          timeInterval:     3000, // ms between updates
        },
        (pos) => {
          if (mounted) {
            setLocation({
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy:  pos.coords.accuracy,
            });
          }
        },
      );
    })();

    return () => {
      mounted = false;
      stopWatching();
    };
  }, [stopWatching]);

  return { location, error, loading, stopWatching };
}
