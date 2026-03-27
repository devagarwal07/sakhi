import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Image, Animated, Alert, Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { cancelRide, callDriver, sendBatteryAlert } from '../src/api/endpoints';
import * as Battery from 'expo-battery';
import * as Sharing from 'expo-sharing';
import ChatModal from '../src/components/ChatModal';

const STATUS_LABELS = {
    assigned: 'Driver Found!',
    driver_en_route: 'Driver En Route',
    arrived: 'Driver Has Arrived',
    in_progress: 'Trip In Progress',
};

const STATUS_COLORS = {
    assigned: Colors.primaryContainer,
    driver_en_route: Colors.secondary,
    arrived: Colors.warning,
    in_progress: Colors.success,
};

export default function ActiveRideScreen() {
    const router = useRouter();
    const { ride, updateStatus, updateDriverLocation, tickWaiting, clearRide } = useRide();
    const { on, off } = useSocket();
    const [chatOpen, setChatOpen] = useState(false);
    const mapRef = useRef(null);
    const driverCoords = useRef(new Animated.ValueXY({
        x: ride.driver?.currentLocation?.latitude || 0,
        y: ride.driver?.currentLocation?.longitude || 0,
    })).current;
    const sheetSlide = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        // Slide up bottom sheet
        Animated.spring(sheetSlide, {
            toValue: 0, tension: 60, friction: 10, useNativeDriver: true,
        }).start();

        // Socket listeners
        const handleLocationUpdate = (coords) => {
            updateDriverLocation(coords);
            mapRef.current?.animateCamera({ center: coords }, { duration: 600 });
        };

        const handleStatusUpdate = ({ status }) => {
            updateStatus(status);
            if (status === 'completed') {
                router.replace('/fare-summary');
            }
        };

        const handleWaitingTick = ({ seconds, charge }) => tickWaiting({ seconds, charge });

        on('driver_location', handleLocationUpdate);
        on('ride:status_update', handleStatusUpdate);
        on('waiting_tick', handleWaitingTick);

        return () => {
            off('driver_location', handleLocationUpdate);
            off('ride:status_update', handleStatusUpdate);
            off('waiting_tick', handleWaitingTick);
        };
    }, []);

    // Battery alert logic
    useEffect(() => {
        let batterySubscription;
        const checkBattery = async () => {
            try {
                const level = await Battery.getBatteryLevelAsync();
                if (level > 0 && level <= 0.05 && ride?.id) {
                    await sendBatteryAlert(ride.driver?.currentLocation || ride.pickup, level * 100);
                }
            } catch { } // fail gracefully if plugin issues
        };
        const setup = async () => {
            const isSupported = await Battery.isAvailableAsync();
            if (isSupported) {
                checkBattery();
                batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
                    if (batteryLevel <= 0.05 && ride?.id) {
                        sendBatteryAlert(ride.driver?.currentLocation || ride.pickup, batteryLevel * 100).catch(() => { });
                    }
                });
            }
        };
        setup();
        return () => batterySubscription?.remove();
    }, [ride?.id, ride?.driver?.currentLocation]);

    const handleShareTrip = async () => {
        const shareUrl = `https://sakhirides.in/track/${ride?.id || 'demo'}`;
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(shareUrl, { dialogTitle: 'Track my Sakhi ride' });
            } else {
                Alert.alert('Live Trip Sharing', `Link: ${shareUrl}`);
            }
        } catch (err) { }
    };

    const handleCancel = () => {
        Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
            { text: 'Keep Ride', style: 'cancel' },
            {
                text: 'Cancel Ride',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelRide(ride.rideId);
                        clearRide();
                        router.replace('/(tabs)');
                    } catch (e) {
                        Alert.alert('Error', 'Could not cancel. Please try again.');
                    }
                },
            },
        ]);
    };

    const statusLabel = STATUS_LABELS[ride.status] || 'Finding Driver…';
    const statusColor = STATUS_COLORS[ride.status] || Colors.primaryContainer;

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: ride.pickup?.latitude || 12.9716,
                    longitude: ride.pickup?.longitude || 77.5946,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {ride.pickup && (
                    <Marker coordinate={ride.pickup} title="Pickup">
                        <View style={styles.pickupMarker}><Text>📍</Text></View>
                    </Marker>
                )}
                {ride.dropoff && (
                    <Marker coordinate={ride.dropoff} title="Dropoff">
                        <View style={styles.dropoffMarker}><Text>🏁</Text></View>
                    </Marker>
                )}
                {ride.driver?.currentLocation && (
                    <Marker coordinate={ride.driver.currentLocation} title="Driver">
                        <View style={styles.carMarker}><Text style={{ fontSize: 24 }}>🚗</Text></View>
                    </Marker>
                )}
                {ride.polyline.length > 1 && (
                    <Polyline
                        coordinates={ride.polyline}
                        strokeColor={Colors.primaryContainer}
                        strokeWidth={3}
                    />
                )}
            </MapView>

            {/* SOS Pills and Share Pill */}
            <View style={styles.topRightPills}>
                <TouchableOpacity
                    style={styles.sosPill}
                    onPress={() => router.push('/sos')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.sosPillText}>🆘  SOS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sharePill}
                    onPress={handleShareTrip}
                    activeOpacity={0.85}
                >
                    <Text style={styles.sharePillText}>🔗  Share</Text>
                </TouchableOpacity>
            </View>

            {/* Status Chip */}
            <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
                <Text style={styles.statusChipText}>{statusLabel}</Text>
            </View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[styles.bottomSheet, { transform: [{ translateY: sheetSlide }] }]}
            >
                {/* Driver Info */}
                {ride.driver && (
                    <View style={styles.driverRow}>
                        <View style={styles.driverAvatar}>
                            {ride.driver.photo
                                ? <Image source={{ uri: ride.driver.photo }} style={styles.avatarImg} />
                                : <Text style={{ fontSize: 28 }}>👩</Text>
                            }
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{ride.driver.name || 'Your Driver'}</Text>
                            <View style={styles.ratingRow}>
                                <Text style={styles.starIcon}>⭐</Text>
                                <Text style={styles.ratingText}>{ride.driver.rating?.toFixed(1) || '4.9'}</Text>
                                <Text style={styles.vehicleText}>  •  {ride.driver.vehicle || 'Auto'}</Text>
                            </View>
                            <Text style={styles.plateText}>{ride.driver.plate || 'KA 01 AB 1234'}</Text>
                        </View>
                        <View style={styles.driverActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => setChatOpen(true)}>
                                <Text style={{ fontSize: 18 }}>💬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={async () => {
                                    try { await callDriver(ride.rideId); }
                                    catch (_) { Alert.alert('Call Failed', 'Could not connect call. Please try again.'); }
                                }}
                            >
                                <Text style={{ fontSize: 18 }}>📞</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Waiting timer (if applicable) */}
                {ride.waitingSeconds > 0 && (
                    <View style={styles.waitingBanner}>
                        <Text style={styles.waitingText}>
                            ⏱ Driver waiting: {Math.floor(ride.waitingSeconds / 60)}m {ride.waitingSeconds % 60}s
                        </Text>
                        {ride.waitingCharge > 0 && (
                            <Text style={styles.waitingCharge}>+₹{ride.waitingCharge.toFixed(1)} waiting</Text>
                        )}
                    </View>
                )}

                {/* Trip info pills */}
                <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfoPill}>
                        <Text style={styles.tripInfoIcon}>📍</Text>
                        <Text style={styles.tripInfoText} numberOfLines={1}>
                            {ride.pickup?.address || 'Current Location'}
                        </Text>
                    </View>
                    <Text style={styles.tripInfoArrow}>→</Text>
                    <View style={styles.tripInfoPill}>
                        <Text style={styles.tripInfoIcon}>🏁</Text>
                        <Text style={styles.tripInfoText} numberOfLines={1}>
                            {ride.dropoff?.address || 'Destination'}
                        </Text>
                    </View>
                </View>

                {/* Cancel (only if not in-progress) */}
                {ride.status !== 'in_progress' && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                        <Text style={styles.cancelBtnText}>Cancel Ride</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* In-ride Chat Modal */}
            <Modal
                visible={chatOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setChatOpen(false)}
            >
                <ChatModal rideId={ride.rideId} onClose={() => setChatOpen(false)} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    topRightPills: {
        position: 'absolute', top: 56, right: 16, zIndex: 10,
        gap: 12, alignItems: 'flex-end',
    },
    sosPill: {
        backgroundColor: '#dc2626',
        borderRadius: BorderRadius.full,
        paddingHorizontal: 16, paddingVertical: 10,
        ...Shadows.editorial,
    },
    sosPillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    sharePill: {
        backgroundColor: Colors.surfaceContainerLowest, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    sharePillText: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 0.5 },
    statusChip: {
        position: 'absolute', top: 56, left: 16,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 14, paddingVertical: 8,
        ...Shadows.card,
    },
    statusChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32,
        ...Shadows.editorial,
    },
    driverRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    },
    driverAvatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    driverInfo: { flex: 1 },
    driverName: { ...Typography.titleSmall, color: Colors.onBackground, marginBottom: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    starIcon: { fontSize: 12 },
    ratingText: { fontSize: 13, fontWeight: '600', color: Colors.onBackground },
    vehicleText: { fontSize: 12, color: Colors.onSurfaceVariant },
    plateText: { fontSize: 11, color: Colors.outline, marginTop: 2, fontWeight: '500' },
    driverActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    waitingBanner: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff7ed',
        borderRadius: 10, padding: 12, marginBottom: 12,
        borderLeftWidth: 3, borderLeftColor: Colors.warning,
    },
    waitingText: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
    waitingCharge: { fontSize: 13, color: Colors.warning, fontWeight: '700' },
    tripInfoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16,
    },
    tripInfoPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    },
    tripInfoIcon: { fontSize: 12 },
    tripInfoText: { flex: 1, fontSize: 11, color: Colors.onSurface, fontWeight: '500' },
    tripInfoArrow: { fontSize: 14, color: Colors.outline },
    cancelBtn: {
        borderWidth: 1.5, borderColor: '#fca5a5',
        borderRadius: BorderRadius.md, paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
    pickupMarker: { alignItems: 'center', justifyContent: 'center' },
    dropoffMarker: { alignItems: 'center', justifyContent: 'center' },
    carMarker: { alignItems: 'center', justifyContent: 'center' },
});
