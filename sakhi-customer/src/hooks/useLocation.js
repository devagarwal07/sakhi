import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

/**
 * Returns the user's current location and starts watching it.
 * Cleans up the watcher on unmount.
 */
export default function useLocation() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
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

            // Get initial location quickly
            const initial = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            if (mounted) {
                setLocation({
                    latitude: initial.coords.latitude,
                    longitude: initial.coords.longitude,
                    accuracy: initial.coords.accuracy,
                });
                setLoading(false);
            }

            // Start continuous watching
            watcherRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // metres before update
                    timeInterval: 3000,   // ms before update
                },
                (pos) => {
                    if (mounted) {
                        setLocation({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
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
