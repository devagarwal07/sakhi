import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import SmartMapView from '../src/components/SmartMapView';

import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import { estimateFare } from '../src/api/endpoints';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

async function fetchDirectionsPolyline(origin, destination) {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].legs[0].steps.flatMap((step) =>
            decodePolyline(step.polyline.points)
        );
        const distance = data.routes[0].legs[0].distance.text;
        const duration = data.routes[0].legs[0].duration.text;
        return { points, distance, duration };
    }
    return { points: [], distance: null, duration: null };
}

// Decode Google encoded polyline
function decodePolyline(encoded) {
    const poly = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;
        shift = 0; result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;
        poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return poly;
}

const { width } = Dimensions.get('window');

export default function RideEstimateScreen() {
    const router = useRouter();
    const { ride, setFare, setPaymentMethod } = useRide();
    const [breakdownExpanded, setBreakdownExpanded] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState('cash');
    const [modal, setModal] = useState(null);
    const [routePolyline, setRoutePolyline] = useState([]);
    const [routeDistance, setRouteDistance] = useState(null);
    const [routeDuration, setRouteDuration] = useState(null);
    const [fareData, setFareData] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(true);

    const pickup = ride?.pickup;
    const dropoff = ride?.dropoff;

    // Compute midpoint for initial map region
    const midLat = pickup && dropoff
        ? (pickup.latitude + dropoff.latitude) / 2
        : (pickup?.latitude || 19.0760);
    const midLng = pickup && dropoff
        ? (pickup.longitude + dropoff.longitude) / 2
        : (pickup?.longitude || 72.8777);
    const latDelta = pickup && dropoff
        ? Math.abs(pickup.latitude - dropoff.latitude) * 1.8 + 0.01
        : 0.04;
    const lngDelta = pickup && dropoff
        ? Math.abs(pickup.longitude - dropoff.longitude) * 1.8 + 0.01
        : 0.04;

    useEffect(() => {
        if (!pickup || !dropoff) {
            setLoadingRoute(false);
            return;
        }
        setLoadingRoute(true);
        Promise.all([
            fetchDirectionsPolyline(pickup, dropoff)
                .then(({ points, distance, duration }) => {
                    setRoutePolyline(points);
                    setRouteDistance(distance);
                    setRouteDuration(duration);
                }),
            estimateFare(pickup, dropoff)
                .then(({ data }) => setFareData(data))
                .catch(() => {}),
        ]).finally(() => setLoadingRoute(false));
    }, []);

    const displayFare = fareData
        ? `₹${fareData.min || fareData.total || '—'} - ₹${fareData.max || fareData.total || '—'}`
        : '—';
    const displayTime = routeDuration || '—';
    const displayDistance = routeDistance || '—';
    const baseFare = fareData?.base || '—';
    const distanceFare = fareData?.distance_fare ?? (fareData?.distance ?? '—');
    const waitingFare = fareData?.waiting || 0;

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.navIconBtn}>
                    <Text style={styles.navIconText}>←</Text>
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Sakhi</Text>
                </View>
                <TouchableOpacity style={styles.navIconBtn} onPress={() => setModal({
                    icon: 'ⓘ',
                    title: 'Options',
                    message: 'Choose an option',
                    buttons: [
                        { text: 'Edit Locations', onPress: () => { setModal(null); router.push('/location-search'); } },
                        { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
                    ]
                })}>
                    <Text style={styles.navDots}>⋮</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Address Pill Card (placed in scrollview so it flows) */}
                <View style={styles.addressPillWrapper}>
                    <View style={styles.addressPill}>
                        <View style={styles.addressIcons}>
                            <View style={styles.solidDot} />
                            <View style={styles.dotLine} />
                            <View style={styles.hollowDot} />
                        </View>
                        <View style={styles.addressTexts}>
                            <Text style={styles.pickupText} numberOfLines={1}>
                                {ride?.pickup?.address || 'Detecting your location…'}
                            </Text>
                            <Text style={styles.dropoffText} numberOfLines={1}>
                                {ride?.dropoff?.address || 'No destination selected'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/location-search')}>
                            <Text style={styles.editBtnText}>✏️</Text>
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Map Section */}
                <View style={styles.mapArea}>
                    {loadingRoute && (
                        <View style={[StyleSheet.absoluteFill, styles.mapLoadingOverlay]}>
                            <ActivityIndicator size="large" color="#BEA3D8" />
                        </View>
                    )}
                    <SmartMapView
                        style={StyleSheet.absoluteFill}
                        center={{ latitude: midLat, longitude: midLng }}
                        latDelta={latDelta}
                        lngDelta={lngDelta}
                        markers={[
                            pickup  && { id: 'pickup',  latitude: pickup.latitude,  longitude: pickup.longitude,  color: '#10B981', label: 'P' },
                            dropoff && { id: 'dropoff', latitude: dropoff.latitude, longitude: dropoff.longitude, color: '#BEA3D8', label: 'D' },
                        ].filter(Boolean)}
                        polylines={routePolyline.length > 1 ? [{ coords: routePolyline, color: '#7C3AED', width: 5 }] : []}
                        scrollEnabled
                        zoomEnabled
                    />
                </View>

                {/* Main Content Area */}
                <View style={styles.bottomContent}>
                    
                    <Text style={styles.sectionHeader}>SELECT RIDE</Text>

                    {/* Ride Selection Card */}
                    <View style={styles.rideCard}>
                        {/* Checkmark Badge */}
                        <View style={styles.checkBadge}>
                            <Text style={styles.checkIcon}>✓</Text>
                        </View>

                        <View style={styles.rideIllustration}>
                            <Text style={{ fontSize: 32 }}>🛺</Text>
                        </View>
                        
                        <View style={styles.rideInfo}>
                            <View style={styles.rideTitleRow}>
                                <Text style={styles.rideTitle}>Auto</Text>
                                <View style={styles.fasterPill}>
                                    <Text style={styles.fasterText}>FASTER</Text>
                                </View>
                            </View>
                            <Text style={styles.rideSubtext}>Up to 3 passengers</Text>
                        </View>
                        
                        <View style={styles.ridePricing}>
                            <Text style={styles.priceText}>{displayFare}</Text>
                            <Text style={styles.timeText}>{displayTime}</Text>
                        </View>
                    </View>

                    {/* Fare Breakdown Header */}
                    <TouchableOpacity 
                        style={styles.breakdownHeaderRow}
                        onPress={() => setBreakdownExpanded(!breakdownExpanded)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.breakdownTitle}>Fare Breakdown</Text>
                        <Text style={styles.breakdownChevron}>{breakdownExpanded ? '⌄' : '›'}</Text>
                    </TouchableOpacity>

                    {/* Fare Breakdown Card */}
                    {breakdownExpanded && (
                        <View style={styles.breakdownCard}>
                            {!fareData && !loadingRoute && (
                                <Text style={styles.fareUnavailableNote}>
                                    💸 Fare estimate unavailable — will be confirmed after booking
                                </Text>
                            )}
                            {fareData && (
                                <>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Base Fare</Text>
                                    <Text style={styles.breakdownValue}>{baseFare !== '—' ? `₹${baseFare}` : '—'}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Distance ({displayDistance})</Text>
                                    <Text style={styles.breakdownValue}>{distanceFare !== '—' ? `₹${distanceFare}` : '—'}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Waiting (if any)</Text>
                                    <Text style={styles.breakdownValue}>₹{waitingFare}</Text>
                                </View>
                                </>
                            )}
                            {loadingRoute && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Calculating fare…</Text>
                                    <ActivityIndicator size="small" color="#BEA3D8" />
                                </View>
                            )}
                        </View>
                    )}

                </View>

            </ScrollView>

            {/* Footer Action Button Wrapper (Sticky) */}
            <View style={styles.footerSticky}>
                <TouchableOpacity 
                    style={[styles.bookButton, (!pickup || !dropoff) && { opacity: 0.5 }]}
                    onPress={() => {
                        if (!pickup || !dropoff) return;
                        if (fareData) {
                            setFare({
                                base:          fareData.base          ?? 0,
                                distance_fare: fareData.distance_fare ?? fareData.distance ?? 0,
                                waiting:       fareData.waiting       ?? 0,
                                total:         fareData.total         ?? fareData.max      ?? 0,
                            });
                        }
                        setPaymentMethod(selectedPayment);
                        router.push('/ride-finding');
                    }}
                    activeOpacity={0.88}
                >
                    <Text style={styles.bookText}>
                        Book {ride?.vehicleType || ride?.vehicle_type || 'Auto'} ›
                    </Text>
                </TouchableOpacity>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { elementType: 'labels', stylers: [{ visibility: 'off' }] }, // hide labels to mimic map in screenshot
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Top Nav
    topNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 52 : 24,
        height: Platform.OS === 'ios' ? 124 : 96,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    navIconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconText: {
        fontSize: 24,
        color: '#BEA3D8',
    },
    navDots: {
        fontSize: 24,
        color: '#BEA3D8',
        lineHeight: 24,
        marginTop: -6,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E1B2E',
        letterSpacing: -0.5,
    },

    // Main content scroll
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 116 : 96, // Under top nav
        paddingBottom: 140, // for sticky footer
    },

    // Address Pill
    addressPillWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 24, // spacing above map
        zIndex: 5,
    },
    addressPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        padding: 16,
        gap: 12,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    addressIcons: {
        alignItems: 'center',
        paddingVertical: 6,
        width: 12,
        alignSelf: 'stretch',
    },
    solidDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#BEA3D8',
    },
    dotLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        backgroundColor: 'rgba(204, 195, 216, 0.3)',
    },
    hollowDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#BEA3D8',
    },
    addressTexts: {
        flex: 1,
        gap: 12,
        justifyContent: 'space-between',
        paddingVertical: 0,
    },
    pickupText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1C1A25',
        lineHeight: 20,
    },
    dropoffText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4A4455',
        lineHeight: 20,
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4, // push slightly away from text
    },
    editBtnText: {
        fontSize: 16,
        // Emojis often have a weird baseline, moving it up 1px fixes visual centering
        marginTop: Platform.OS === 'ios' ? -2 : 0, 
    },

    // Map Area
    mapArea: {
        height: 236,
        width: '100%',
        overflow: 'hidden',
    },
    mapLoadingOverlay: {
        zIndex: 10,
        backgroundColor: 'rgba(245, 240, 255, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapStartMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#BEA3D8',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    mapEndMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#BEA3D8',
    },

    // Bottom Content
    bottomContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4A4455',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },

    // Ride Card
    rideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        borderWidth: 2,
        borderColor: '#BEA3D8',
        borderRadius: 16,
        padding: 8,
        paddingRight: 16,
        marginBottom: 24,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    checkBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#BEA3D8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#F5F0FF',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    checkIcon: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    rideIllustration: {
        width: 64,
        height: 64,
        backgroundColor: '#F5F0FF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    rideInfo: {
        flex: 1,
    },
    rideTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rideTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
    },
    fasterPill: {
        backgroundColor: 'rgba(190, 163, 216, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    fasterText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#BEA3D8',
        letterSpacing: 0.5,
    },
    rideSubtext: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4A4455',
        marginTop: 2,
    },
    ridePricing: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#BEA3D8',
        letterSpacing: -0.45,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16A34A',
        marginTop: 2,
    },

    // Fare Breakdown Header
    breakdownHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 6,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4A4455',
    },
    breakdownChevron: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4A4455',
        marginTop: -4, // visual alignment
    },

    // Fare Breakdown Card
    breakdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
        marginBottom: 24, // spacing before sticky footer
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4A4455',
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1A25',
    },
    fareUnavailableNote: {
        fontSize: 13,
        fontWeight: '400',
        color: '#7B7487',
        textAlign: 'center',
        paddingVertical: 8,
        lineHeight: 20,
    },
    // Footer
    footerSticky: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
        // Mimicking a gradient fade with alpha bg
    },
    bookButton: {
        height: 64,
        backgroundColor: '#BEA3D8',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
        elevation: 8,
    },
    bookText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
