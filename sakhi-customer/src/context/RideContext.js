import React, { createContext, useContext, useState, useCallback } from 'react';

const RideContext = createContext(null);

const initialState = {
    rideId: null,
    status: null,
    pickup: null,    // { latitude, longitude, address }
    dropoff: null,   // { latitude, longitude, address }
    driver: null,    // { id, name, photo, rating, vehicle, plate, phone }
    fare: null,      // { base, distance_fare, waiting, promo, total }
    paymentMethod: 'cash',
    estimatedETA: null,
    waitingSeconds: 0,
    waitingCharge: 0,
    polyline: [],
};


export function RideProvider({ children }) {
    const [ride, setRide] = useState(initialState);

    const setPickup = useCallback((pickup) => setRide((r) => ({ ...r, pickup })), []);
    const setDropoff = useCallback((dropoff) => setRide((r) => ({ ...r, dropoff })), []);
    const setRideId = useCallback((rideId) => setRide((r) => ({ ...r, rideId })), []);
    const setDriver = useCallback((driver) => setRide((r) => ({ ...r, driver })), []);
    const setFare   = useCallback((fare)   => setRide((r) => ({ ...r, fare })), []);
    const setPaymentMethod = useCallback((paymentMethod) => setRide((r) => ({ ...r, paymentMethod })), []);

    const startRide = useCallback((rideId, driver, fare) => {
        setRide((r) => ({ ...r, rideId, driver, fare, status: 'assigned' }));
    }, []);

    const updateStatus = useCallback((status) => {
        setRide((r) => ({ ...r, status }));
    }, []);

    const updateDriverLocation = useCallback((coords) => {
        setRide((r) => ({
            ...r,
            driver: r.driver ? { ...r.driver, currentLocation: coords } : r.driver,
        }));
    }, []);

    const tickWaiting = useCallback(({ seconds, charge }) => {
        setRide((r) => ({ ...r, waitingSeconds: seconds, waitingCharge: charge }));
    }, []);

    const updateFare = useCallback((fare) => setRide((r) => ({ ...r, fare })), []);

    const setPolyline = useCallback((polyline) => setRide((r) => ({ ...r, polyline })), []);

    const updateSubscription = useCallback((updates) => {
        setRide((r) => ({ ...r, subscription: { ...r.subscription, ...updates } }));
    }, []);

    const clearRide = useCallback(() => setRide(initialState), []);

    return (
        <RideContext.Provider
            value={{
                ride,
                setPickup,
                setDropoff,
                setRideId,
                setDriver,
                setFare,
                setPaymentMethod,
                startRide,
                updateStatus,
                updateDriverLocation,
                tickWaiting,
                updateFare,
                setPolyline,
                updateSubscription,
                clearRide,
            }}
        >
            {children}
        </RideContext.Provider>
    );
}

export function useRide() {
    const ctx = useContext(RideContext);
    if (!ctx) throw new Error('useRide must be used inside RideProvider');
    return ctx;
}
