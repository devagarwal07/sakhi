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
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (mounted) setError('Location permission denied');
                    setLoading(false);
                    return;
                }

                // Try to get a precise fix first
                try {
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
                } catch (posErr) {
                    // GPS/location services off at device level — try last known position
                    try {
                        const last = await Location.getLastKnownPositionAsync();
                        if (last && mounted) {
                            setLocation({
                                latitude: last.coords.latitude,
                                longitude: last.coords.longitude,
                                accuracy: last.coords.accuracy,
                            });
                        } else if (mounted) {
                            setError('Location unavailable. Please enable location services.');
                        }
                    } catch (_) {
                        if (mounted) setError('Location unavailable. Please enable location services.');
                    } finally {
                        if (mounted) setLoading(false);
                    }
                    // Don't start watcher if initial GPS failed
                    return;
                }

                // Start continuous watching
                try {
                    watcherRef.current = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            distanceInterval: 10,
                            timeInterval: 3000,
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
                } catch (watchErr) {
                    // Watcher failed — location still available from initial fix, just no live updates
                    console.warn('[useLocation] watchPositionAsync failed:', watchErr.message);
                }
            } catch (err) {
                if (mounted) {
                    setError('Location unavailable. Please enable location services.');
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
            stopWatching();
        };
    }, [stopWatching]);

    return { location, error, loading, stopWatching };
}
