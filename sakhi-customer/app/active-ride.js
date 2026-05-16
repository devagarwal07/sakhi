import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Image, Animated, Modal, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SmartMapView from '../src/components/SmartMapView';

import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { cancelRide, callDriver, sendBatteryAlert, shareTrip, getEmergencyContacts } from '../src/api/endpoints';

import * as Battery from 'expo-battery';
import * as Sharing from 'expo-sharing';
import ChatModal from '../src/components/ChatModal';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';

const LIVE_SHARING_KEY = 'sakhi_live_sharing_enabled';

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
    const insets = useSafeAreaInsets();
    const { ride, updateStatus, updateDriverLocation, tickWaiting, clearRide } = useRide();
    const { on, off } = useSocket();
    const [chatOpen, setChatOpen] = useState(false);
    const mapRef = useRef(null);
    const driverCoords = useRef(new Animated.ValueXY({
        x: ride.driver?.currentLocation?.latitude || 0,
        y: ride.driver?.currentLocation?.longitude || 0,
    })).current;
    const sheetSlide = useRef(new Animated.Value(300)).current;
    const [modal, setModal] = useState(null);
    const [shareShown, setShareShown] = useState(false);
    const [liveSharingEnabled, setLiveSharingEnabled] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [showContactPrompt, setShowContactPrompt] = useState(false);

    // Load live sharing preference from Safety settings
    useEffect(() => {
        AsyncStorage.getItem(LIVE_SHARING_KEY)
            .then(val => {
                const enabled = val === 'true';
                setLiveSharingEnabled(enabled);
                if (enabled) {
                    getEmergencyContacts().then(({ data }) => {
                        const list = data.contacts || data || [];
                        setContacts(list);
                        // Auto-show prompt if they have contacts
                        if (list.length > 0) setShowContactPrompt(true);
                    }).catch(() => {});
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        // Slide up bottom sheet
        Animated.spring(sheetSlide, {
            toValue: 0, tension: 60, friction: 10, useNativeDriver: true,
        }).start();

        // Socket listeners — registered here so they fire as long as this screen is mounted
        const handleLocationUpdate = ({ lat, lng, heading }) => {
            const coords = { latitude: lat, longitude: lng, heading };
            updateDriverLocation(coords);
            if (mapRef.current) {
                mapRef.current.animateCamera?.({ center: coords }, { duration: 600 });
            }
        };

        const handleStatusUpdate = ({ status }) => {
            updateStatus(status);
            if (status === 'completed') {
                router.replace('/ride-summary');
            }
        };

        const handleWaitingTick  = ({ seconds, charge }) => tickWaiting({ seconds, charge });

        // Payment success from driver confirms cash collection on their end
        const handlePaymentSuccess = () => {
            router.replace('/ride-summary');
        };

        on('driver_location',    handleLocationUpdate);
        on('ride:status_update', handleStatusUpdate);
        on('waiting_tick',       handleWaitingTick);
        on('payment:success',    handlePaymentSuccess);

        return () => {
            off('driver_location',    handleLocationUpdate);
            off('ride:status_update', handleStatusUpdate);
            off('waiting_tick',       handleWaitingTick);
            off('payment:success',    handlePaymentSuccess);
        };
    }, []);

    // Battery alert logic
    useEffect(() => {
        let batterySubscription;
        const checkBattery = async () => {
            try {
                const level = await Battery.getBatteryLevelAsync();
                const levelPct = level * 100;
                if (level > 0 && level <= 0.05 && ride?.id) {
                    const loc = ride.driver?.currentLocation || ride.pickup;
                    const lat = loc?.latitude ?? 0;
                    const lng = loc?.longitude ?? 0;
                    await sendBatteryAlert({ lat, lng }, levelPct);
                }
            } catch { } // fail gracefully if plugin issues
        };
        const setup = async () => {
            const isSupported = await Battery.isAvailableAsync();
            if (isSupported) {
                checkBattery();
                batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
                    if (batteryLevel <= 0.05 && ride?.id) {
                        const loc = ride.driver?.currentLocation || ride.pickup;
                        sendBatteryAlert(
                            { lat: loc?.latitude ?? 0, lng: loc?.longitude ?? 0 },
                            batteryLevel * 100
                        ).catch(() => { });
                    }
                });
            }
        };
        setup();
        return () => batterySubscription?.remove();
    }, [ride?.id, ride?.driver?.currentLocation]);

    // Replaced the OS share sheet with the Contact selection popup
    const handleShareTrip = () => {
        if (!ride?.rideId) {
            setModal({ icon: '🔗', title: 'Not Available', message: 'Trip sharing is only available during an active ride.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }

        if (contacts.length === 0) {
            // Fetch on demand if not loaded yet
            getEmergencyContacts().then(({ data }) => {
                const list = data.contacts || data || [];
                setContacts(list);
                setShowContactPrompt(true);
            }).catch(() => setShowContactPrompt(true));
        } else {
            setShowContactPrompt(true);
        }
    };

    const handleShareWithContact = async (contact) => {
        try {
            setShowContactPrompt(false);
            const { data } = await shareTrip(ride.rideId);
            const shareUrl = data?.share_url;
            if (!shareUrl) throw new Error('No share URL returned');
            setShareShown(true);
            
            // Open SMS app directly with the phone number and link
            const message = `Track my Sakhi ride live: ${shareUrl}`;
            const smsUrl = Platform.OS === 'ios' ? `sms:${contact.phone}&body=${encodeURIComponent(message)}` : `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
            
            Linking.canOpenURL(smsUrl)
                .then(supported => {
                    if (supported) Linking.openURL(smsUrl);
                    else {
                        setModal({
                            icon: '🔗', title: 'Live Trip Link', message: shareUrl, buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                        });
                    }
                });
        } catch (err) {
            setModal({
                icon: '⚠️', title: 'Share Failed', message: err.response?.data?.error?.message ?? 'Could not generate share link.', buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        }
    };

    const handleShareMoreOptions = async () => {
        try {
            setShowContactPrompt(false);
            const { data } = await shareTrip(ride.rideId);
            const shareUrl = data?.share_url;
            if (!shareUrl) throw new Error('No share URL returned');
            setShareShown(true);
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(shareUrl, { dialogTitle: 'Track my Sakhi ride' });
            } else {
                setModal({ icon: '🔗', title: 'Live Trip Link', message: shareUrl, buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            }
        } catch (err) {}
    };

    const handleCancel = () => {
        setModal({
            icon: '⚠️',
            title: 'Cancel Ride',
            message: 'Are you sure you want to cancel this ride?',
            buttons: [
                { text: 'Keep Ride', style: 'cancel', onPress: () => setModal(null) },
                {
                    text: 'Cancel Ride',
                    style: 'destructive',
                    onPress: async () => {
                        setModal(null);
                        try {
                            await cancelRide(ride.rideId);
                            clearRide();
                            router.replace('/(tabs)');
                        } catch (e) {
                            setTimeout(() => {
                                setModal({
                                    icon: '⚠️',
                                    title: 'Error',
                                    message: 'Could not cancel. Please try again.',
                                    buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                                });
                            }, 500);
                        }
                    }
                }
            ]
        });
    };

    const statusLabel = STATUS_LABELS[ride.status] || 'Finding Driver…';
    const statusColor = STATUS_COLORS[ride.status] || Colors.primaryContainer;

    const topOverlayTop = Math.max(insets.top + 12, 56);
    const bottomSheetPaddingBottom = Math.max(insets.bottom + 12, 32);

    return (
        <View style={styles.container}>
            {/* Map */}
            <SmartMapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                center={ride.pickup || { latitude: 19.0760, longitude: 72.8777 }}
                zoom={15}
                markers={[
                    ride.pickup          && { id: 'pickup',  latitude: ride.pickup.latitude,                    longitude: ride.pickup.longitude,                    color: '#BEA3D8', label: 'P' },
                    ride.dropoff         && { id: 'dropoff', latitude: ride.dropoff.latitude,                   longitude: ride.dropoff.longitude,                   color: '#1E1B2E', label: 'D' },
                    ride.driver?.currentLocation && { id: 'driver',  latitude: ride.driver.currentLocation.latitude, longitude: ride.driver.currentLocation.longitude, color: '#BEA3D8', pulse: true },
                ].filter(Boolean)}
                polylines={ride.polyline?.length > 1 ? [{ coords: ride.polyline, color: '#BEA3D8', width: 3 }] : []}
            />

            {/* SOS Pill — always visible */}
            <View style={[styles.topRightPills, { top: topOverlayTop }]}>
                <TouchableOpacity
                    style={styles.sosPill}
                    onPress={() => router.push('/sos-warning')}
                    activeOpacity={0.85}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="alert-triangle" size={14} color="#fff" />
                        <Text style={styles.sosPillText}>SOS</Text>
                    </View>
                </TouchableOpacity>

                {/* Share pill — only shown when live sharing is enabled AND user has tapped Share */}
                {liveSharingEnabled && shareShown && (
                    <TouchableOpacity
                        style={styles.sharePill}
                        onPress={handleShareTrip}
                        activeOpacity={0.85}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="share" size={12} color="#7C3AED" />
                            <Text style={styles.sharePillText}>Sharing</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Chip */}
            <View style={[styles.statusChip, { top: topOverlayTop, backgroundColor: statusColor }]}>
                <Text style={styles.statusChipText}>{statusLabel}</Text>
            </View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    { paddingBottom: bottomSheetPaddingBottom },
                    { transform: [{ translateY: sheetSlide }] },
                ]}
            >
                {/* Driver Info */}
                {ride.driver && (
                    <View style={styles.driverRow}>
                        <View style={styles.driverAvatar}>
                            {ride.driver.photo
                                ? <Image source={{ uri: ride.driver.photo }} style={styles.avatarImg} />
                                : <Feather name="user" size={28} color="#FFFFFF" />
                            }
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{ride.driver.name || 'Your Driver'}</Text>
                            <View style={styles.ratingRow}>
                                <Feather name="star" size={12} color="#F59E0B" style={{ marginRight: 2 }} />
                                <Text style={styles.ratingText}>{ride.driver.rating?.toFixed(1) || '4.9'}</Text>
                                <Text style={styles.vehicleText}>  •  {ride.driver.vehicle || 'Auto'}</Text>
                            </View>
                            <Text style={styles.plateText}>{ride.driver.plate || 'KA 01 AB 1234'}</Text>
                        </View>
                        <View style={styles.driverActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => setChatOpen(true)}>
                                <Feather name="message-circle" size={18} color="#1E1B2E" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={async () => {
                                    try { await callDriver(ride.rideId); }
                                    catch (_) {
                                        setModal({
                                            icon: '⚠️',
                                            title: 'Call Failed',
                                            message: 'Could not connect call. Please try again.',
                                            buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                                        });
                                    }
                                }}
                            >
                                <Feather name="phone-call" size={18} color="#1E1B2E" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Waiting timer (if applicable) */}
                {ride.waitingSeconds > 0 && (
                    <View style={styles.waitingBanner}>
                        <Text style={styles.waitingText}>
                            <Text style={styles.waitingTimerText}><Feather name="clock" size={13} color="#1E1B2E" /> Driver waiting: {Math.floor(ride.waitingSeconds / 60)}m {ride.waitingSeconds % 60}s</Text>
                        </Text>
                        {ride.waitingCharge > 0 && (
                            <Text style={styles.waitingCharge}>+₹{ride.waitingCharge.toFixed(1)} waiting</Text>
                        )}
                    </View>
                )}

                {/* Trip info pills */}
                <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfoPill}>
                        <Feather name="map-pin" size={12} color="#BEA3D8" />
                        <Text style={styles.tripInfoText} numberOfLines={1}>
                            {ride.pickup?.address || 'Current Location'}
                        </Text>
                    </View>
                    <Feather name="arrow-right" size={14} color="#94A3B8" />
                    <View style={styles.tripInfoPill}>
                        <Feather name="flag" size={12} color="#1E1B2E" />
                        <Text style={styles.tripInfoText} numberOfLines={1}>
                            {ride.dropoff?.address || 'Destination'}
                        </Text>
                    </View>
                </View>

                {/* Cancel + Share Trip row */}
                <View style={[styles.bottomActionRow, { flexWrap: 'wrap', gap: 8 }]}>
                    {ride.status !== 'in_progress' && (
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                    {liveSharingEnabled && (
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShareTrip} activeOpacity={0.85}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Feather name="share" size={14} color="#7C3AED" />
                                <Text style={styles.shareBtnText}>Share Trip</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    {ride.driver?.upi_id && ride.paymentMethod === 'cash' && (
                        <TouchableOpacity 
                            style={[styles.shareBtn, { backgroundColor: '#E8F5E9', borderColor: '#22C55E' }]} 
                            onPress={() => {
                                const upiUrl = `upi://pay?pa=${ride.driver.upi_id}&pn=${encodeURIComponent(ride.driver.name)}&am=${ride.fare?.total || ride.fare?.estimated || ''}&cu=INR`;
                                Linking.openURL(upiUrl).catch(() => {
                                    setModal({
                                        icon: '⚠️', title: 'UPI Failed', message: 'Could not open UPI app.', buttons: [{ text: 'OK', onPress: () => setModal(null)}]
                                    });
                                });
                            }} 
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.shareBtnText, { color: '#16A34A' }]}><Feather name="smartphone" size={13} color="#16A34A" /> Pay via UPI</Text>
                        </TouchableOpacity>
                    )}
                </View>
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

            {/* Custom Contact Selection Modal for Live Sharing */}
            <Modal
                visible={showContactPrompt}
                transparent
                animationType="fade"
                onRequestClose={() => setShowContactPrompt(false)}
            >
                <View style={styles.contactModalBackdrop}>
                    <View style={styles.contactModalCard}>
                        <View style={styles.contactModalHeader}>
                            <Text style={styles.contactModalTitle}>Share Live Trip</Text>
                            <TouchableOpacity onPress={() => setShowContactPrompt(false)} style={styles.contactModalClose}>
                                <Feather name="x" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.contactModalSub}>Select an emergency contact to send your live tracking link.</Text>

                        {contacts.length === 0 ? (
                            <View style={styles.noContactsBox}>
                                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>No emergency contacts found.</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
                                {contacts.map((c, i) => (
                                    <TouchableOpacity 
                                        key={i} 
                                        style={styles.contactRow}
                                        activeOpacity={0.7}
                                        onPress={() => handleShareWithContact(c)}
                                    >
                                        <View style={styles.contactAvatar}>
                                            {c.name ? <Text style={{ fontSize: 16, color: '#BEA3D8', fontWeight: 'bold' }}>{c.name[0].toUpperCase()}</Text> : <Feather name="user" size={16} color="#BEA3D8" />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.contactName}>{c.name}</Text>
                                            <Text style={styles.contactPhone}>{c.phone}</Text>
                                        </View>
                                        <View style={styles.contactSendBtn}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#BEA3D8' }}>Send</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                        
                        <TouchableOpacity style={styles.moreOptionsBtn} onPress={handleShareMoreOptions}>
                            <Text style={styles.moreOptionsText}>Share via More Options</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    topRightPills: {
        position: 'absolute', right: 16, zIndex: 10,
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
        position: 'absolute', left: 16,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 14, paddingVertical: 8,
        ...Shadows.card,
    },
    statusChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 20,
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
        flex: 1,
        borderWidth: 1.5, borderColor: '#fca5a5',
        borderRadius: BorderRadius.md, paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
    shareBtn: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        borderRadius: BorderRadius.md, paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(190,163,216,0.4)',
    },
    shareBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },
    bottomActionRow: { flexDirection: 'row', gap: 10 },
    pickupMarker: { alignItems: 'center', justifyContent: 'center' },
    dropoffMarker: { alignItems: 'center', justifyContent: 'center' },
    carMarker: { alignItems: 'center', justifyContent: 'center' },
    
    // Contact Modal Styles
    contactModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 26, 37, 0.55)',
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
    },
    contactModalCard: {
        width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF',
        borderRadius: 24, padding: 24,
    },
    contactModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    contactModalTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5 },
    contactModalClose: { width: 32, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
    contactModalSub: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 20 },
    noContactsBox: { paddingVertical: 32, alignItems: 'center' },
    contactList: { maxHeight: 220, marginBottom: 16 },
    contactRow: { 
        flexDirection: 'row', alignItems: 'center', gap: 12, 
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' 
    },
    contactAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center',
    },
    contactName: { fontSize: 15, fontWeight: '600', color: '#1E1B2E', marginBottom: 2 },
    contactPhone: { fontSize: 13, color: '#64748B' },
    contactSendBtn: { backgroundColor: '#F5F0FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    moreOptionsBtn: {
        width: '100%', height: 48, backgroundColor: '#F5F0FF',
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    moreOptionsText: { fontSize: 14, fontWeight: '700', color: '#64748B' }
});
