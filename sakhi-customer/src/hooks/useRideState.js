import { useRef, useCallback } from 'react';
import { useRide } from '../context/RideContext';

/**
 * Manages local ride state transitions and validation.
 * Provides helper methods consumed by ActiveRide, Searching, and FareSummary screens.
 */
export default function useRideState() {
    const {
        ride,
        setPickup,
        setDropoff,
        startRide,
        updateStatus,
        updateDriverLocation,
        tickWaiting,
        updateFare,
        setPolyline,
        clearRide,
    } = useRide();

    const isActive = useCallback(() => {
        return ['assigned', 'driver_en_route', 'arrived', 'in_progress'].includes(ride.status);
    }, [ride.status]);

    const isSearching = useCallback(() => ride.status === 'searching', [ride.status]);

    const isCompleted = useCallback(() => ride.status === 'completed', [ride.status]);

    const hasPickup = useCallback(() => !!ride.pickup?.latitude, [ride.pickup]);

    const hasDropoff = useCallback(() => !!ride.dropoff?.latitude, [ride.dropoff]);

    const canBook = useCallback(
        () => hasPickup() && hasDropoff() && !isActive() && !isSearching(),
        [hasPickup, hasDropoff, isActive, isSearching],
    );

    return {
        ride,
        // Setters
        setPickup,
        setDropoff,
        startRide,
        updateStatus,
        updateDriverLocation,
        tickWaiting,
        updateFare,
        setPolyline,
        clearRide,
        // Derived state
        isActive,
        isSearching,
        isCompleted,
        hasPickup,
        hasDropoff,
        canBook,
    };
}
