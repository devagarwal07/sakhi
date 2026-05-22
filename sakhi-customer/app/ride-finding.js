import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Animated, Platform, ScrollView, Alert, BackHandler
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import SmartMapView from '../src/components/SmartMapView';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import { isWithinBengaluru } from '../src/utils/constants';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { bookRide, cancelRide } from '../src/api/endpoints';
import SakhiModal from '../src/components/SakhiModal';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const RetryIcon = () => (
    <Svg viewBox="0 0 640 640" width={18} height={18}>
        <Path fill="#FFFFFF" d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"/>
    </Svg>
);

const { width } = Dimensions.get('window');

export default function RideFindingScreen() {
    const router = useRouter();
    const { ride, setRideId, setDriver, updateStatus } = useRide();
    const { on, off, joinRideRoom } = useSocket();
    const [modal, setModal] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    const [showNoDrivers, setShowNoDrivers] = useState(false);

    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 60 : 56);

    const cancelPaddingBottom = Math.max(
        insets.bottom + (Platform.OS === 'ios' ? 6 : 8),
        24
    );
    const rideIdRef  = useRef(null);    // persists across re-renders without re-triggering effects
    const mountedRef = useRef(true);     // guard against setState after unmount

    // Reanimated pulses for the center pin
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const pulse3 = useRef(new Animated.Value(0)).current;

    // Lock navigation — prevent back button from exiting active screen
    useEffect(() => {
        const backAction = () => true;
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    // ── Animate search pulses ──────────────────────────────────────────────────
    useEffect(() => {
        const createLoop = (anim, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };

        createLoop(pulse1, 0);
        createLoop(pulse2, 600);
        createLoop(pulse3, 1200);

        return () => { mountedRef.current = false; };
    }, []);

    // ── Book ride + wire real-time socket listeners ───────────────────────────
    useEffect(() => {
        if ((ride?.pickup && !isWithinBengaluru(ride.pickup)) || (ride?.dropoff && !isWithinBengaluru(ride.dropoff))) {
            router.replace('/bengaluru-only');
            return;
        }
        let booked = false;

        const handleRideAssigned = ({ ride_id, driver, status }) => {
            if (!mountedRef.current) return;
            if (rideIdRef.current && ride_id !== rideIdRef.current) return; // stale event

            // Normalise driver payload from matchingEngine
            const normalised = {
                id:      driver?.id,
                name:    driver?.name    ?? 'Your Driver',
                phone:   driver?.phone   ?? null,
                photo:   driver?.profile_photo_url ?? null,
                rating:  driver?.avg_rating ?? 4.8,
                vehicle: {
                    type:  driver?.vehicle_type   ?? 'Auto',
                    plate: driver?.vehicle_reg_no ?? '',
                    model: driver?.vehicle_model  ?? '',
                    color: driver?.vehicle_color  ?? '',
                },
                upi_id:  driver?.upi_id ?? null,
            };

            setDriver(normalised);
            updateStatus(status ?? 'assigned');
            router.replace('/driver-arrived');
        };

        const handleNoDrivers = ({ ride_id }) => {
            if (!mountedRef.current) return;
            if (rideIdRef.current && ride_id !== rideIdRef.current) return;
            setShowNoDrivers(true);
        };

        // Register socket listeners BEFORE booking so we never miss the event
        on('ride_assigned',    handleRideAssigned);
        on('ride:no_drivers',  handleNoDrivers);

        const doBooking = async () => {
            try {
                if (!ride?.pickup || !ride?.dropoff) {
                    setBookingError('Pickup or dropoff location missing. Please go back and try again.');
                    return;
                }

                const { data } = await bookRide({
                    pickup_lat:     ride.pickup.latitude,
                    pickup_lng:     ride.pickup.longitude,
                    pickup_address: ride.pickup.address ?? '',
                    drop_lat:       ride.dropoff.latitude,
                    drop_lng:       ride.dropoff.longitude,
                    drop_address:   ride.dropoff.address ?? '',
                    payment_method: ride.paymentMethod  ?? 'cash',
                    ...(ride.promoCode ? { promo_code: ride.promoCode } : {}),
                });

                if (!mountedRef.current) return;

                booked = true;
                const rideId = data.ride_id;
                rideIdRef.current = rideId;
                setRideId(rideId);

                // Join the ride room — backend will now forward ride_assigned to us
                await joinRideRoom(rideId).catch(() => {
                    // Non-fatal: we still get events via rider:<userId> room
                    console.warn('[RideFinding] joinRideRoom failed — relying on rider room fallback');
                });

            } catch (err) {
                if (!mountedRef.current) return;
                const msg = err.response?.data?.error?.message ?? 'Could not book ride. Please try again.';
                // Handle "already active ride" gracefully
                if (err.response?.data?.error?.code === 'ACTIVE_RIDE_EXISTS') {
                    const existingId = err.response?.data?.error?.details?.ride_id;
                    if (existingId) {
                        rideIdRef.current = existingId;
                        setRideId(existingId);
                        await joinRideRoom(existingId).catch(() => {});
                        return; // reconnected to existing ride
                    }
                }
                setBookingError(msg);
            }
        };

        doBooking();

        return () => {
            off('ride_assigned',   handleRideAssigned);
            off('ride:no_drivers', handleNoDrivers);
        };
    }, []); // run once on mount

    // ── Show booking error ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!bookingError) return;
        setShowNoDrivers(true);
    }, [bookingError]);

    // ── Cancel ride handler ────────────────────────────────────────────────────
    const handleCancel = useCallback(() => {
        setModal({
            icon: '🔄',
            title: 'Cancel Ride?',
            message: 'Stop searching for a driver?',
            buttons: [
                { text: 'Keep Searching', style: 'cancel', onPress: () => setModal(null) },
                {
                    text: 'Cancel Ride',
                    style: 'destructive',
                    onPress: async () => {
                        setModal(null);
                        if (rideIdRef.current) {
                            // Fire-and-forget — don't block navigation on cancel response
                            cancelRide(rideIdRef.current, 'Rider cancelled during search').catch(() => {});
                        }
                        router.replace('/(tabs)/');
                    },
                },
            ],
        });
    }, []);

    return (
        <View style={styles.container}>
            {/* Map Area (Top 55%) */}
            <View style={styles.mapArea}>
                <SmartMapView
                    style={StyleSheet.absoluteFill}
                    center={{
                        latitude:  ride?.pickup?.latitude  || 19.0760,
                        longitude: ride?.pickup?.longitude || 72.8777,
                    }}
                    zoom={13}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    nearbyAutos={true}
                    markers={[
                        ride?.pickup && {
                            id: 'pickup',
                            latitude:  ride.pickup.latitude,
                            longitude: ride.pickup.longitude,
                            markerType: 'pickup',
                            color: '#8031CC',
                        },
                        ride?.dropoff && {
                            id: 'dropoff',
                            latitude:  ride.dropoff.latitude,
                            longitude: ride.dropoff.longitude,
                            markerType: 'dropoff',
                            color: '#1E1B2E',
                        },
                    ].filter(Boolean)}
                    polylines={ride?.pickup && ride?.dropoff ? [{
                        coords: [
                            { latitude: ride.pickup.latitude,  longitude: ride.pickup.longitude },
                            { latitude: ride.dropoff.latitude, longitude: ride.dropoff.longitude },
                        ],
                        color: '#8031CC',
                        width: 4,
                        animated: true,
                    }] : []}
                />
                
                {/* Desaturation overlay to match ethereal look */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />

                {/* Animated Center Pin */}
                <View style={styles.animatedPinContainer}>
                    {/* Ripple 3 */}
                    <Animated.View style={[styles.ripple, {
                        width: 256, height: 256, borderRadius: 128,
                        borderColor: 'rgba(128, 49, 204, 0.1)',
                        transform: [{ scale: pulse3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                        opacity: pulse3.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.5, 0] })
                    }]} />
                    {/* Ripple 2 */}
                    <Animated.View style={[styles.ripple, {
                        width: 192, height: 192, borderRadius: 96,
                        borderColor: 'rgba(163, 96, 228, 0.2)',
                        transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                        opacity: pulse2.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.4, 0] })
                    }]} />
                    {/* Ripple 1 */}
                    <Animated.View style={[styles.ripple, {
                        width: 128, height: 128, borderRadius: 64,
                        borderColor: 'rgba(119, 46, 190, 0.3)',
                        transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                        opacity: pulse1.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 0.3, 0] })
                    }]} />
                    
                    {/* Center solid pin (using emoji as placeholder for location_on) */}
                    <View style={styles.solidPin}>
                        <Feather name="map-pin" size={24} color="#8C37DD" />
                    </View>
                </View>
            </View>

            {/* Top Navigation Bar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                    <TouchableOpacity onPress={handleCancel} style={styles.navIconBtn}>
                    <Feather name="arrow-left" size={24} color="#BEA3D8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navIconBtn} onPress={() => setModal({
                    icon: '📧',
                    title: 'Ride Options',
                    message: 'How can we help you?',
                    buttons: [
                        { text: 'Contact Support', onPress: () => { setModal(null); setTimeout(() => setModal({ icon: '📞', title: 'Support', message: 'Our team will call you shortly.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] }), 300); } },
                        { text: 'Cancel Search', style: 'destructive', onPress: () => { setModal(null); router.replace('/(tabs)/'); } },
                        { text: 'Close', style: 'cancel', onPress: () => setModal(null) },
                    ],
                })}>
                    <Feather name="more-vertical" size={24} color="#BEA3D8" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet (Bottom 45%) */}
            <View style={styles.bottomSheet}>
                {/* Floating Badge overlapping map and sheet */}
                <View style={styles.badgeWrapper}>
                    <View style={styles.badge}>
                        <MaterialCommunityIcons name="rickshaw" size={28} color="#BEA3D8" />
                    </View>
                </View>

                {/* Content */}
                <ScrollView 
                    contentContainerStyle={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Titles */}
                    <View style={styles.headerTitles}>
                        <Text style={styles.titleText}>Finding Your Sakhi...</Text>
                        <Text style={styles.subtitleText}>Matching you with the nearest Sakhi driver</Text>
                    </View>

                    {/* Info Rows */}
                    <View style={styles.infoRows}>
                        {/* Pickup */}
                        <View style={styles.row}>
                            <View style={styles.iconCol}>
                                <View style={styles.pickupDot} />
                            </View>
                            <View style={styles.textCol}>
                                <Text style={styles.label}>PICKUP</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {ride?.pickup?.address || 'Locating pickup...'}
                                </Text>
                            </View>
                        </View>

                        {/* Drop */}
                        <View style={styles.row}>
                            <View style={styles.iconCol}>
                                <Feather name="map-pin" size={14} color="#BEA3D8" />
                            </View>
                            <View style={styles.textCol}>
                                <Text style={styles.label}>DROP</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {ride?.dropoff?.address || 'Finalizing destination...'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Wait Pill */}
                    <View style={styles.waitPillContainer}>
                        <View style={styles.waitPill}>
                            <Text style={styles.waitText}>Estimated wait: ~2 mins</Text>
                        </View>
                    </View>

                </ScrollView>
                
                {/* Cancel Button */}
                <View style={[styles.cancelBtnWrap, { paddingBottom: cancelPaddingBottom }]}>
                    <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={handleCancel}>
                        <Text style={styles.cancelBtnText}>Cancel Ride</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.fadeBottom} />
            </View>
            {/* No Drivers / Booking Failed Beautiful Screen */}
            {showNoDrivers && (
                <View style={styles.noDriversOverlay}>
                    <View style={styles.noDriversCard}>
                        {/* Animated auto illustration */}
                        <View style={styles.noDriversIconWrap}>
                            <View style={styles.noDriversPulse1} />
                            <View style={styles.noDriversPulse2} />
                            <MaterialCommunityIcons name="rickshaw" size={48} color="#BEA3D8" />
                        </View>

                        <Text style={styles.noDriversTitle}>All Sakhis Are Busy</Text>
                        <Text style={styles.noDriversMsg}>
                            We regret to inform you that all Sakhis are currently serving your other sisters. Please book us again soon!
                        </Text>

                        <TouchableOpacity
                            style={styles.noDriversRetryBtn}
                            onPress={() => {
                                setShowNoDrivers(false);
                                setBookingError(null);
                                router.replace('/ride-estimate');
                            }}
                            activeOpacity={0.84}
                        >
                            <View style={styles.retryBtnContent}>
                                <RetryIcon />
                                <Text style={styles.noDriversRetryText}>Try Again</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.noDriversHomeBtn}
                            onPress={() => router.replace('/(tabs)/')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.noDriversHomeText}>Go Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#F5F0FF' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#F1F5F9' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        height: 64,
        backgroundColor: '#F5F0FF', 
        zIndex: 10
    },
    iconBtn: { 
        width: 32, 
        height: 32, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: { 
        fontSize: 24, 
        color: '#BEA3D8', 
        fontWeight: 'bold' 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1E1B2E', 
        letterSpacing: -0.5,
        marginLeft: 16
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },
    mapArea: {
        height: '55%',
        width: '100%',
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },

    // Animated Pin styles
    animatedPinContainer: {
        position: 'absolute',
        width: 256,
        height: 256,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ripple: {
        position: 'absolute',
        borderWidth: 2,
    },
    solidPin: {
        width: 32,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    // Top Nav Bar
    topNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.9)', // #F5F0FF
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
        zIndex: 10,
    },
    navIconBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconText: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: 'bold',
    },
    navDots: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: 'bold',
        marginTop: -6,
    },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '45%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: -16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 8,
        zIndex: 2,
    },

    // Floating Badge
    badgeWrapper: {
        position: 'absolute',
        top: -32,
        left: '50%',
        marginLeft: -32,
        width: 64,
        height: 64,
        zIndex: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F5F0FF',
        borderWidth: 4,
        borderColor: 'rgba(190, 163, 216, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeIcon: {
        fontSize: 24,
        color: '#BEA3D8',
    },

    sheetContent: {
        paddingTop: 56, // Space for the floating badge
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    // Header Titles
    headerTitles: {
        alignItems: 'center',
        gap: 4,
        marginBottom: 32,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        lineHeight: 28,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
        textAlign: 'center',
    },

    // Info Rows
    infoRows: {
        paddingHorizontal: 16,
        gap: 24,
        marginBottom: 32,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    iconCol: {
        width: 16,
        alignItems: 'center',
        paddingTop: 2,
    },
    pickupDot: {
        width: 8,
        height: 8,
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    dropPin: {
        fontSize: 14,
        color: '#BEA3D8',
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 20,
    },

    // Wait Pill
    waitPillContainer: {
        alignItems: 'center',
    },
    waitPill: {
        backgroundColor: '#F5F0FF',
        borderRadius: 9999,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    waitText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        lineHeight: 16,
    },

    // Fade Bottom to simulate that cut-off/gradient look in user screenshot
    fadeBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        backgroundColor: 'rgba(235, 230, 245, 0.5)',
        opacity: 0.5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    cancelBtnWrap: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 8,
    },
    cancelBtn: {
        width: '100%', height: 52,
        borderWidth: 2, borderColor: '#EF4444',
        borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

    // No Drivers / Booking Failed overlay
    noDriversOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(245, 240, 255, 0.96)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        paddingHorizontal: 28,
    },
    noDriversCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.12,
        shadowRadius: 40,
        elevation: 12,
    },
    noDriversIconWrap: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    noDriversPulse1: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(190, 163, 216, 0.12)',
    },
    noDriversPulse2: {
        position: 'absolute',
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(190, 163, 216, 0.18)',
    },
    noDriversEmoji: {
        fontSize: 44,
    },
    noDriversTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E1B2E',
        letterSpacing: -0.5,
        marginBottom: 12,
        textAlign: 'center',
    },
    noDriversMsg: {
        fontSize: 15,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    noDriversRetryBtn: {
        width: '100%',
        height: 56,
        backgroundColor: '#BEA3D8',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
    },
    noDriversRetryText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    retryBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    noDriversHomeBtn: {
        width: '100%',
        height: 48,
        backgroundColor: '#F5F0FF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDriversHomeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#BEA3D8',
    },
});

