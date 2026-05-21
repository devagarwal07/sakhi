import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Image, Platform, ScrollView, Linking, ActivityIndicator, BackHandler
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SmartMapView from '../src/components/SmartMapView';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { callDriver, cancelRide } from '../src/api/endpoints';

const { width } = Dimensions.get('window');

export default function DriverArrivedScreen() {
    const router = useRouter();
    const { ride, updateStatus, updateDriverLocation } = useRide();
    const { on, off } = useSocket();
    const TOTAL_WAIT = 3 * 60;
    const [secondsLeft, setSecondsLeft] = useState(TOTAL_WAIT);
    const intervalRef = useRef(null);
    const [modal, setModal] = useState(null);
    const [calling, setCalling] = useState(false);
    const mountedRef = useRef(true);

    // Lock navigation — prevent back button from exiting active screen
    useEffect(() => {
        const backAction = () => true;
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 60 : 56);

    const tabBarPaddingBottom = Platform.OS === 'ios'
        ? Math.max(insets.bottom, 24)
        : insets.bottom;
    const tabBarHeight = (Platform.OS === 'ios' ? 76 : 87) + tabBarPaddingBottom;
    const bottomSpacerHeight = tabBarHeight + 20;

    // Use real pickup coords from RideContext; fall back to Mumbai center
    const pickupLat = ride?.pickup?.latitude || 19.0760;
    const pickupLng = ride?.pickup?.longitude || 72.8777;
    const coords = { latitude: pickupLat, longitude: pickupLng };

    // Real driver info from ride context
    const driverName = ride?.driver?.name || 'Your Driver';
    const driverVehicle = ride?.driver?.vehicle
        ? `${ride.driver.vehicle.type || 'Auto'} · ${ride.driver.vehicle.plate || ''}`
        : 'Auto';
    const driverRating = ride?.driver?.rating ? `${ride.driver.rating} ★` : '—';
    const driverPhone = ride?.driver?.phone || null;
    const driverPhoto = ride?.driver?.photo || 'https://i.pravatar.cc/150?img=11';

    // ── Countdown timer for free-wait display ───────────────────────────────────────
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => {
            clearInterval(intervalRef.current);
            mountedRef.current = false;
        };
    }, []);

    // ── Socket: ride status updates from backend ───────────────────────────────
    useEffect(() => {
        const handleStatusUpdate = ({ status }) => {
            if (!mountedRef.current) return;
            updateStatus(status);
            if (status === 'in_progress') {
                // Driver started the trip — move to active ride screen
                router.replace('/active-ride');
            } else if (status === 'completed') {
                router.replace('/ride-summary');
            }
        };

        const handleDriverLocation = ({ lat, lng, heading }) => {
            if (!mountedRef.current) return;
            // Update driver position on the map
            updateDriverLocation({ latitude: lat, longitude: lng, heading });
        };

        const handleDriverReconnecting = ({ message }) => {
            if (!mountedRef.current) return;
            setModal({
                icon: '📶',
                title: 'Connection Issue',
                message: message ?? 'Your driver lost connection. Waiting for reconnect…',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
        };

        on('ride:status_update',   handleStatusUpdate);
        on('driver_location',      handleDriverLocation);
        on('driver_reconnecting',  handleDriverReconnecting);

        return () => {
            off('ride:status_update',   handleStatusUpdate);
            off('driver_location',      handleDriverLocation);
            off('driver_reconnecting',  handleDriverReconnecting);
        };
    }, []);

    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secs = String(secondsLeft % 60).padStart(2, '0');
    const progress = secondsLeft / TOTAL_WAIT; // 1.0 → 0.0

    return (
        <View style={styles.container}>
            {/* Map Area */}
            <View style={styles.mapArea}>
                <SmartMapView
                    style={StyleSheet.absoluteFill}
                    center={{ latitude: pickupLat, longitude: pickupLng }}
                    zoom={15}
                    markers={[{ id: 'driver', latitude: pickupLat, longitude: pickupLng, color: '#BEA3D8', pulse: true }]}
                    scrollEnabled={false}
                    zoomEnabled={false}
                />
                
                {/* Gradient fade at the bottom of the map */}
                <View style={styles.mapGradientFade} />
            </View>

            {/* Top Navigation AppBar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.navIconBtn}>
                    <Feather name="arrow-left" size={24} color="#BEA3D8" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Arrived</Text>
                </View>
                <TouchableOpacity style={styles.navIconBtn} onPress={() => setModal({
                    icon: '⚙️',
                    title: 'Options',
                    message: 'How can we help you?',
                    buttons: [
                        { text: 'Report Issue', onPress: () => { setModal(null); router.push('/complaint'); } },
                        { text: 'Contact Support', onPress: () => { setModal(null); Linking.openURL('tel:18001234567'); } },
                        { text: 'Close', style: 'cancel', onPress: () => setModal(null) },
                    ],
                })}>
                    <Feather name="more-vertical" size={24} color="#BEA3D8" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Overlay */}
            <View style={styles.bottomSheetWrapper}>
                <ScrollView 
                    contentContainerStyle={styles.bottomSheet}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Status Badge */}
                    <TouchableOpacity style={styles.statusBadge} onPress={() => router.push('/active-ride')} activeOpacity={0.8}>
                        <View style={styles.checkIconWrapper}>
                            <Feather name="check" size={12} color="#FFFFFF" />
                        </View>
                        <Text style={styles.statusBadgeText}>Your Driver Has Arrived!</Text>
                    </TouchableOpacity>

                    {/* Driver Row */}
                    <View style={styles.driverRow}>
                        <View style={styles.driverProfileGrp}>
                            <View style={styles.avatarWrapper}>
                                <Image 
                                    source={{ uri: driverPhoto }} 
                                    style={styles.avatarImage} 
                                />
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>{driverRating}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>{driverName}</Text>
                                <Text style={styles.driverVehicle}>{driverVehicle}</Text>
                            </View>
                        </View>

                        <View style={styles.actionBtns}>
                            <TouchableOpacity
                                style={[styles.callBtn, calling && { opacity: 0.6 }]}
                                disabled={calling}
                                onPress={async () => {
                                    if (!ride?.rideId) return;
                                    setCalling(true);
                                    try {
                                        // Exotel masked call — hides real phone numbers
                                        await callDriver(ride.rideId);
                                        setModal({
                                            icon: '📞',
                                            title: 'Calling Driver',
                                            message: 'Sakhi will connect you via a masked number. Neither party sees the real number.',
                                            buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                                        });
                                    } catch (err) {
                                        const msg = err.response?.data?.error?.message;
                                        if (msg === 'Calling service is not configured.' && driverPhone) {
                                            Linking.openURL(`tel:${driverPhone}`);
                                        } else {
                                            setModal({
                                                icon: '⚠️',
                                                title: 'Call Failed',
                                                message: msg ?? 'Could not connect call. Please try again.',
                                                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                                            });
                                        }
                                    } finally {
                                        setCalling(false);
                                    }
                                }}
                            >
                                {calling
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Feather name="phone-call" size={20} color="#BEA3D8" />
                                }
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.msgBtn} onPress={() => setModal({ icon: '✉️', title: 'Message Driver', message: 'Chat with driver feature coming soon.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] })}>
                                <Feather name="message-square" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Waiting Timer Card */}
                    <View style={styles.timerCard}>
                        <View style={styles.timerHeader}>
                            <Text style={styles.timerLabel}>FREE WAITING WINDOW</Text>
                            <Text style={styles.timerLabel}>3:00 MINS</Text>
                        </View>
                        <View style={styles.timerDisplay}>
                            <Text style={[styles.timerBigText, secondsLeft <= 30 && { color: '#BA1A1A' }]}>{mins}:{secs}</Text>
                        </View>
                        {/* Live Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarActive, { width: `${progress * 100}%`, backgroundColor: secondsLeft <= 30 ? '#BA1A1A' : '#BEA3D8' }]} />
                        </View>
                        <View style={styles.timerFooter}>
                            <View style={styles.infoIconWrapper}>
                                <Text style={styles.infoIcon}>i</Text>
                            </View>
                            <Text style={styles.timerFooterText}>{secondsLeft <= 30 ? 'WAITING CHARGES MAY APPLY SOON' : 'NO WAITING CHARGES YET'}</Text>
                        </View>
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                            setModal({
                                icon: '🛑',
                                title: 'Cancel Ride?',
                                message: 'Are you sure you want to cancel the ride? A cancellation fee might apply.',
                                buttons: [
                                    { text: 'Keep Ride', style: 'cancel', onPress: () => setModal(null) },
                                    {
                                        text: 'Cancel Ride',
                                        style: 'destructive',
                                        onPress: async () => {
                                            setModal(null);
                                            if (ride?.rideId) {
                                                try {
                                                    await cancelRide(ride.rideId, 'Rider cancelled after driver arrived');
                                                    router.replace('/(tabs)/');
                                                } catch (err) {
                                                    setModal({
                                                        icon: '⚠️',
                                                        title: 'Failed to Cancel',
                                                        message: err.response?.data?.error?.message || 'Could not cancel ride.',
                                                        buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                                                    });
                                                }
                                            } else {
                                                router.replace('/(tabs)/');
                                            }
                                        }
                                    }
                                ]
                            });
                        }}
                    >
                        <Text style={styles.cancelBtnText}>CANCEL RIDE</Text>
                    </TouchableOpacity>

                    {/* Padding for tab bar */}
                    <View style={{ height: bottomSpacerHeight }} />
                </ScrollView>
            </View>

            {/* Dummy Tab Bar Overlay */}
            <View style={[styles.dummyTabBar, { height: tabBarHeight, paddingBottom: tabBarPaddingBottom }]}>
                <View style={styles.tabItemActive}>
                    <Feather name="home" size={20} color="#BEA3D8" />
                    <Text style={styles.tabLabelActive}>HOME</Text>
                </View>
                <View style={styles.tabItem}>
                    <Feather name="activity" size={20} color="#6B7280" />
                    <Text style={styles.tabLabel}>ACTIVITY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Feather name="shield" size={20} color="#6B7280" />
                    <Text style={styles.tabLabel}>SAFETY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Feather name="user" size={20} color="#6B7280" />
                    <Text style={styles.tabLabel}>PROFILE</Text>
                </View>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#F1F5F9' }] },
    // Only keeping large text labels visible with gray color
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    // Top Nav
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
        zIndex: 10,
    },
    navIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    navIconArrow: { fontSize: 24, color: '#BEA3D8' },
    navDots: { fontSize: 24, color: '#BEA3D8', marginTop: -6 },
    titleContainer: { flex: 1, marginLeft: 16 },
    title: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45 },

    // Map Area
    mapArea: { height: '55%', width: '100%' }, // Takes up top 50-55% visual space before sheet overlaps
    mapGradientFade: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
        backgroundColor: 'rgba(246, 246, 248, 0.4)', // Rough simulation of fading gradient at bottom
        opacity: 0.8,
    },

    // Map Markers
    driverMarkerContainer: { alignItems: 'center', gap: 8 },
    arrivedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 9999,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    arrivedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
    arrivedBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    
    driverIconOuter: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(190, 163, 216, 0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    driverIconInner: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
    },

    // Bottom Sheet Overlay
    bottomSheetWrapper: {
        flex: 1,
        marginTop: -48, // Overlaps the map
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 48, borderTopRightRadius: 48,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.12, shadowRadius: 48, elevation: 16,
    },
    bottomSheet: {
        paddingTop: 40,
        paddingHorizontal: 24,
    },

    // Status Badge
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        backgroundColor: '#ECFDF5',
        borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 16,
        height: 60, width: '100%',
    },
    checkIconWrapper: {
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center'
    },
    checkIcon: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
    statusBadgeText: { fontSize: 16, fontWeight: '700', color: '#064E3B', letterSpacing: -0.4 },

    // Driver Row
    driverRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 32,
    },
    driverProfileGrp: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrapper: { width: 64, height: 64, borderRadius: 16 },
    avatarImage: { width: '100%', height: '100%', borderRadius: 16 },
    ratingBadge: {
        position: 'absolute', right: -4, bottom: -4,
        backgroundColor: '#BEA3D8', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 9999,
    },
    ratingText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
    driverDetails: { gap: 2 },
    driverName: { fontSize: 18, fontWeight: '700', color: '#1E1B2E' },
    driverVehicle: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },
    actionBtns: { flexDirection: 'row', gap: 12 },
    callBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center',
    },
    callIconText: { fontSize: 20 }, // placeholder for icon
    msgBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#BEA3D8',
        alignItems: 'center', justifyContent: 'center',
    },
    msgIconText: { fontSize: 20 }, // placeholder for white icon

    // Waiting Timer Card
    timerCard: {
        marginTop: 24, backgroundColor: '#FFFFFF', padding: 24,
        borderWidth: 1, borderColor: 'rgba(204, 195, 216, 0.1)', borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    timerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    timerLabel: { fontSize: 10, fontWeight: '700', color: '#1E1B2E', letterSpacing: 1 },
    timerDisplay: { alignItems: 'center', marginVertical: 8 },
    timerBigText: { fontSize: 56, fontWeight: '800', color: '#1E1B2E', letterSpacing: -2.8, lineHeight: 56 },
    progressBarBg: { height: 6, backgroundColor: '#F5F0FF', borderRadius: 3, marginVertical: 12 },
    progressBarActive: { width: '80%', height: '100%', backgroundColor: '#BEA3D8', borderRadius: 3 }, // Fixed width to match 2:34 mockup state
    timerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 },
    infoIconWrapper: {
        width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#10B981',
        alignItems: 'center', justifyContent: 'center'
    },
    infoIcon: { fontSize: 8, fontWeight: 'bold', color: '#10B981', marginTop: -1 },
    timerFooterText: { fontSize: 11, fontWeight: '600', color: '#059669', letterSpacing: 0.55 },

    // Dummy Tab Bar
    dummyTabBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 15,
    },
    tabItem: { alignItems: 'center', gap: 4 },
    tabItemActive: { alignItems: 'center', gap: 2, backgroundColor: '#F5F0FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
    tabIcon: { fontSize: 20, color: '#6B7280' },
    tabIconActive: { fontSize: 20, color: '#BEA3D8' },
    tabLabelActive: { fontSize: 10, fontWeight: '600', color: '#BEA3D8', letterSpacing: 1 },

    // Cancel Button styles
    cancelBtn: {
        marginTop: 20,
        backgroundColor: '#FFF5F5',
        borderWidth: 1.5,
        borderColor: '#FEE2E2',
        borderRadius: 16,
        height: 56,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
        letterSpacing: 0.5,
    },
});
