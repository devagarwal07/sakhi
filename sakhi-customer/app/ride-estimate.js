import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Animated, Alert, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { estimateFare, bookRide } from '../src/api/endpoints';

const VEHICLE_OPTIONS = [
    { id: 'auto', label: 'Auto', emoji: '🛺', capacity: 'Up to 3 passengers', badge: 'FASTER' },
    { id: 'cab', label: 'Cab', emoji: '🚗', capacity: 'Up to 4 passengers', badge: null },
];

export default function RideEstimateScreen() {
    const router = useRouter();
    const { ride, setPickup, setDropoff, startRide, setPolyline } = useRide();
    const { emit } = useSocket();
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState('auto');
    const [promoCode, setPromoCode] = useState('');
    const [fareExpanded, setFareExpanded] = useState(false);
    const sheetAnim = useRef(new Animated.Value(400)).current;

    useEffect(() => {
        // Slide up the bottom sheet
        Animated.spring(sheetAnim, {
            toValue: 0, tension: 55, friction: 10, useNativeDriver: true,
        }).start();

        if (ride.pickup && ride.dropoff) {
            fetchEstimate();
        }
    }, []);

    const fetchEstimate = async () => {
        setLoading(true);
        try {
            const { data } = await estimateFare(ride.pickup, ride.dropoff);
            setEstimate(data);
            if (data.polyline) setPolyline(data.polyline);
        } catch (err) {
            Alert.alert('Error', 'Could not get fare estimate. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async () => {
        setBooking(true);
        try {
            const { data } = await bookRide({
                pickup_lat: ride.pickup.latitude,
                pickup_lng: ride.pickup.longitude,
                pickup_address: ride.pickup.address,
                dropoff_lat: ride.dropoff.latitude,
                dropoff_lng: ride.dropoff.longitude,
                dropoff_address: ride.dropoff.address,
                vehicle_type: selectedVehicle,
                promo_code: promoCode || undefined,
            });

            // Emit socket event to notify backend ride is confirmed
            emit('ride:new', { rideId: data.ride.id });
            startRide(data.ride.id, null, data.ride.fare);
            router.replace('/searching');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Booking failed. Please try again.';
            Alert.alert('Booking Failed', msg);
        } finally {
            setBooking(false);
        }
    };

    const selectedEstimate = estimate?.vehicles?.[selectedVehicle];

    return (
        <View style={styles.container}>
            {/* Map with route */}
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: ride.pickup?.latitude || 12.9716,
                    longitude: ride.pickup?.longitude || 77.5946,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                }}
                customMapStyle={[
                    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ccc3d8' }] },
                ]}
            >
                {ride.pickup && <Marker coordinate={ride.pickup}><Text style={{ fontSize: 20 }}>📍</Text></Marker>}
                {ride.dropoff && <Marker coordinate={ride.dropoff}><Text style={{ fontSize: 20 }}>🏁</Text></Marker>}
                {ride.polyline?.length > 1 && (
                    <Polyline
                        coordinates={ride.polyline}
                        strokeColor={Colors.primaryContainer}
                        strokeWidth={4}
                    />
                )}
            </MapView>

            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Bottom sheet */}
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
                {/* Route pill */}
                <View style={styles.routePill}>
                    <View style={styles.routePillRoute}>
                        <View style={styles.routeDotGreen} />
                        <Text style={styles.routeAddr} numberOfLines={1}>{ride.pickup?.address || 'Pickup'}</Text>
                    </View>
                    <Text style={styles.routeArrow}>→</Text>
                    <View style={styles.routePillRoute}>
                        <View style={styles.routeDotViolet} />
                        <Text style={styles.routeAddr} numberOfLines={1}>{ride.dropoff?.address || 'Dropoff'}</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingBlock}>
                        <ActivityIndicator size="large" color={Colors.primaryContainer} />
                        <Text style={styles.loadingText}>Getting best fares…</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Distance + time pill */}
                        <View style={styles.metaPill}>
                            <Text style={styles.metaText}>
                                {estimate?.distance_km?.toFixed(1) || '—'} km  ·  ~{estimate?.duration_min || '—'} min ride
                            </Text>
                        </View>

                        {/* Vehicle options */}
                        <Text style={styles.sectionLabel}>Select Ride</Text>
                        {VEHICLE_OPTIONS.map((v) => {
                            const vEst = estimate?.vehicles?.[v.id];
                            const selected = selectedVehicle === v.id;
                            return (
                                <TouchableOpacity
                                    key={v.id}
                                    style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
                                    onPress={() => setSelectedVehicle(v.id)}
                                    activeOpacity={0.85}
                                >
                                    {selected && (
                                        <View style={styles.selectedBadge}><Text style={styles.selectedCheck}>✓</Text></View>
                                    )}
                                    <View style={[styles.vehicleIconBg, selected && styles.vehicleIconBgSelected]}>
                                        <Text style={{ fontSize: 28 }}>{v.emoji}</Text>
                                    </View>
                                    <View style={styles.vehicleInfo}>
                                        <View style={styles.vehicleNameRow}>
                                            <Text style={styles.vehicleName}>{v.label}</Text>
                                            {v.badge && (
                                                <View style={styles.vehicleBadge}>
                                                    <Text style={styles.vehicleBadgeText}>{v.badge}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.vehicleCapacity}>{v.capacity}</Text>
                                    </View>
                                    <View style={styles.vehiclePricing}>
                                        <Text style={styles.vehiclePrice}>
                                            {vEst ? `₹${vEst.min}–₹${vEst.max}` : 'Loading…'}
                                        </Text>
                                        <Text style={styles.vehicleETA}>
                                            {vEst?.eta_min ? `${vEst.eta_min} min away` : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Fare breakdown */}
                        {selectedEstimate && (
                            <View style={styles.fareCard}>
                                <TouchableOpacity
                                    style={styles.fareToggle}
                                    onPress={() => setFareExpanded(!fareExpanded)}
                                >
                                    <Text style={styles.fareToggleText}>Fare Breakdown</Text>
                                    <Text style={styles.fareToggleChevron}>{fareExpanded ? '▲' : '▼'}</Text>
                                </TouchableOpacity>
                                {fareExpanded && (
                                    <View style={styles.fareRows}>
                                        {[
                                            { label: 'Base Fare', value: selectedEstimate.base },
                                            { label: `Distance (${estimate?.distance_km?.toFixed(1)} km)`, value: selectedEstimate.distance },
                                            { label: 'Waiting (if any)', value: 0 },
                                        ].map((row, i) => (
                                            <View key={i} style={styles.fareRow}>
                                                <Text style={styles.fareRowLabel}>{row.label}</Text>
                                                <Text style={styles.fareRowValue}>₹{row.value?.toFixed(0) || 0}</Text>
                                            </View>
                                        ))}
                                        <View style={styles.fareTotalRow}>
                                            <Text style={styles.fareTotalLabel}>Total Estimate</Text>
                                            <Text style={styles.fareTotalValue}>₹{selectedEstimate.min}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ height: 24 }} />
                    </ScrollView>
                )}

                {/* Book CTA */}
                <TouchableOpacity
                    style={[styles.bookBtn, (loading || booking) && { opacity: 0.6 }]}
                    onPress={handleBook}
                    disabled={loading || booking}
                    activeOpacity={0.88}
                >
                    {booking ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.bookBtnText}>
                            Book {selectedVehicle === 'auto' ? '🛺 Auto' : '🚗 Cab'}
                        </Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    backBtn: {
        position: 'absolute', top: 56, left: 16,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.surfaceContainerLowest,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.card,
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
        maxHeight: '68%',
        ...Shadows.editorial,
    },
    routePill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 12, padding: 12, marginBottom: 14,
        borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    routePillRoute: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    routeDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
    routeDotViolet: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer },
    routeAddr: { flex: 1, fontSize: 12, color: Colors.onSurface, fontWeight: '500' },
    routeArrow: { fontSize: 14, color: Colors.outline },
    loadingBlock: { paddingVertical: 32, alignItems: 'center', gap: 12 },
    loadingText: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant },
    metaPill: {
        alignSelf: 'center', backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 6,
        marginBottom: 16,
    },
    metaText: {
        fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
    },
    vehicleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 2, borderColor: 'transparent',
        position: 'relative',
    },
    vehicleCardSelected: {
        backgroundColor: '#EDE9FE',
        borderColor: Colors.primaryContainer,
    },
    selectedBadge: {
        position: 'absolute', top: -8, right: -8,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    selectedCheck: { color: '#fff', fontWeight: '700', fontSize: 12 },
    vehicleIconBg: {
        width: 56, height: 56, borderRadius: 14,
        backgroundColor: Colors.surfaceContainerLowest,
        alignItems: 'center', justifyContent: 'center',
    },
    vehicleIconBgSelected: { backgroundColor: '#F5F0FF' },
    vehicleInfo: { flex: 1 },
    vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    vehicleName: { fontSize: 16, fontWeight: '700', color: Colors.onBackground },
    vehicleBadge: {
        backgroundColor: 'rgba(124,58,237,0.1)',
        borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2,
    },
    vehicleBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer },
    vehicleCapacity: { fontSize: 12, color: Colors.onSurfaceVariant },
    vehiclePricing: { alignItems: 'flex-end' },
    vehiclePrice: { fontSize: 16, fontWeight: '800', color: Colors.primaryContainer },
    vehicleETA: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 2 },
    fareCard: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: Colors.outlineVariant,
        marginTop: 4,
    },
    fareToggle: {
        flexDirection: 'row', justifyContent: 'space-between',
        padding: 14, alignItems: 'center',
    },
    fareToggleText: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant },
    fareToggleChevron: { fontSize: 12, color: Colors.outline },
    fareRows: { paddingHorizontal: 14, paddingBottom: 14 },
    fareRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
    },
    fareRowLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
    fareRowValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
    fareTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
        marginTop: 4,
    },
    fareTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.onBackground },
    fareTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.primaryContainer },
    bookBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 18,
        alignItems: 'center', marginTop: 12, ...Shadows.editorial,
    },
    bookBtnText: { color: Colors.onPrimary, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
});
