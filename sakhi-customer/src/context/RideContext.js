import React, { createContext, useContext, useState, useCallback } from 'react';

const RideContext = createContext(null);

// ── DEV BYPASS — mirrors the flag in AuthContext ──────────────────────────────
const DEVELOPER_BYPASS = true;

// Generate the next N upcoming weekday dates from today
function getUpcomingWeekdays(count) {
    const dates = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1); // start from tomorrow
    while (dates.length < count) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) { // skip Sunday(0) and Saturday(6)
            dates.push(cursor.toISOString().slice(0, 10));
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

const MOCK_SCHEDULED_DATES = getUpcomingWeekdays(20);

// Second subscription: starts from Apr 22 specifically
function getDatesStartingFrom(startDateStr, count) {
    const dates = [];
    const cursor = new Date(startDateStr + 'T00:00:00');
    while (dates.length < count) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
            dates.push(cursor.toISOString().slice(0, 10));
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

const MOCK_SCHEDULED_DATES_2 = getDatesStartingFrom('2026-04-22', 12);

const DEV_INITIAL_STATE = {
    rideId: null,
    status: null,
    pickup:  { latitude: 19.0760, longitude: 72.8777, address: 'Andheri West, Mumbai, Maharashtra' },
    dropoff: { latitude: 18.9220, longitude: 72.8347, address: 'Churchgate, Mumbai, Maharashtra' },
    stop: null,
    driver: null,
    fare: null,
    paymentMethod: 'upi',
    estimatedETA: null,
    waitingSeconds: 0,
    waitingCharge: 0,
    polyline: [],
    // Primary subscription (kept for backward-compat)
    subscription: {
        id: 'dev-sub-001',
        morningTime: '8:30 AM',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        rides_total: 22,
        rides_used: 2,
        plan: 22,
        used: 2,
        total_rides: 22,
        scheduled_dates: MOCK_SCHEDULED_DATES,
        pickup:  { address: 'Andheri West, Mumbai, Maharashtra' },
        dropoff: { address: 'Churchgate, Mumbai, Maharashtra' },
    },
    // Full list for multi-subscription UI
    subscriptions: [
        {
            id: 'dev-sub-001',
            morningTime: '8:30 AM',
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            rides_total: 22,
            rides_used: 2,
            total_rides: 22,
            scheduled_dates: MOCK_SCHEDULED_DATES,
            pickup:  { address: 'Andheri West, Mumbai, Maharashtra' },
            dropoff: { address: 'Churchgate, Mumbai, Maharashtra' },
        },
        {
            id: 'dev-sub-002',
            morningTime: '6:00 PM',
            days: ['Mon', 'Tue', 'Wed', 'Thu'],
            rides_total: 12,
            rides_used: 0,
            total_rides: 12,
            scheduled_dates: MOCK_SCHEDULED_DATES_2,
            pickup:  { address: 'Bandra West, Mumbai, Maharashtra' },
            dropoff: { address: 'Lower Parel, Mumbai, Maharashtra' },
        },
    ],
};

const initialState = {
    rideId: null,
    status: null,
    pickup: null,    // { latitude, longitude, address }
    dropoff: null,   // { latitude, longitude, address }
    stop: null,      // { latitude, longitude, address } — optional via/stop point
    driver: null,    // { id, name, photo, rating, vehicle, plate, phone }
    fare: null,      // { base, distance_fare, waiting, promo, total }
    paymentMethod: 'cash',
    estimatedETA: null,
    waitingSeconds: 0,
    waitingCharge: 0,
    polyline: [],
};


export function RideProvider({ children }) {
    const [ride, setRide] = useState(DEVELOPER_BYPASS ? DEV_INITIAL_STATE : initialState);

    const setPickup = useCallback((pickup) => setRide((r) => ({ ...r, pickup })), []);
    const setDropoff = useCallback((dropoff) => setRide((r) => ({ ...r, dropoff })), []);
    const setStop   = useCallback((stop)   => setRide((r) => ({ ...r, stop })),   []);
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
                setStop,
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
