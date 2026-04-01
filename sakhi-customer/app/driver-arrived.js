import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Image, Platform, ScrollView, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import SakhiModal from '../src/components/SakhiModal';

const { width } = Dimensions.get('window');

export default function DriverArrivedScreen() {
    const router = useRouter();
    const TOTAL_WAIT = 3 * 60;
    const [secondsLeft, setSecondsLeft] = useState(TOTAL_WAIT);
    const intervalRef = useRef(null);
    const [modal, setModal] = useState(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secs = String(secondsLeft % 60).padStart(2, '0');
    const progress = secondsLeft / TOTAL_WAIT; // 1.0 → 0.0

    const coords = { latitude: 12.9716, longitude: 77.5946 };

    return (
        <View style={styles.container}>
            {/* Map Area */}
            <View style={styles.mapArea}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    showsUserLocation={false}
                    initialRegion={{
                        latitude: 12.9716,
                        longitude: 77.5946,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    customMapStyle={mapStyle}
                >
                    <Marker coordinate={coords} anchor={{ x: 0.5, y: 0.4 }}>
                        <View style={styles.driverMarkerContainer}>
                            {/* Floating 'Arrived' Badge */}
                            <View style={styles.arrivedBadge}>
                                <View style={styles.arrivedDot} />
                                <Text style={styles.arrivedBadgeText}>Arrived</Text>
                            </View>

                            {/* Driver Icon */}
                            <View style={styles.driverIconOuter}>
                                <View style={styles.driverIconInner}>
                                    <Text style={{ fontSize: 18 }}>🛺</Text>
                                </View>
                            </View>
                        </View>
                    </Marker>
                </MapView>
                
                {/* Gradient fade at the bottom of the map */}
                <View style={styles.mapGradientFade} />
            </View>

            {/* Top Navigation AppBar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navIconBtn}>
                    <Text style={styles.navIconArrow}>←</Text>
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
                    <Text style={styles.navDots}>⋮</Text>
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
                            <Text style={styles.checkIcon}>✓</Text>
                        </View>
                        <Text style={styles.statusBadgeText}>Your Driver Has Arrived!</Text>
                    </TouchableOpacity>

                    {/* Driver Row */}
                    <View style={styles.driverRow}>
                        <View style={styles.driverProfileGrp}>
                            <View style={styles.avatarWrapper}>
                                <Image 
                                    // Placeholder image resembling a driver
                                    source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
                                    style={styles.avatarImage} 
                                />
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>4.9 ★</Text>
                                </View>
                            </View>
                            
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>Meena R.</Text>
                                <Text style={styles.driverVehicle}>Auto · KA 05 AB 1234</Text>
                            </View>
                        </View>

                        <View style={styles.actionBtns}>
                            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:+919876500001')}>
                                <Text style={styles.callIconText}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.msgBtn} onPress={() => setModal({ icon: '✉️', title: 'Message Driver', message: 'Chat with driver feature coming soon.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] })}>
                                <Text style={styles.msgIconText}>✉️</Text>
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

                    {/* Padding for tab bar */}
                    <View style={{ height: 120 }} />
                </ScrollView>
            </View>

            {/* Dummy Tab Bar Overlay */}
            <View style={styles.dummyTabBar}>
                <View style={styles.tabItemActive}>
                    <Text style={styles.tabIconActive}>🏠</Text>
                    <Text style={styles.tabLabelActive}>HOME</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>🚙</Text>
                    <Text style={styles.tabLabel}>ACTIVITY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>🛡️</Text>
                    <Text style={styles.tabLabel}>SAFETY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>👤</Text>
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
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    // Only keeping large text labels visible with gray color
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FCF8FF' },

    // Top Nav
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 104 : 60,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
    driverName: { fontSize: 18, fontWeight: '700', color: '#1C1A25' },
    driverVehicle: { fontSize: 14, fontWeight: '500', color: '#1C1A25' },
    actionBtns: { flexDirection: 'row', gap: 12 },
    callBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#F6F1FF',
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
    timerLabel: { fontSize: 10, fontWeight: '700', color: '#1C1A25', letterSpacing: 1 },
    timerDisplay: { alignItems: 'center', marginVertical: 8 },
    timerBigText: { fontSize: 56, fontWeight: '800', color: '#1C1A25', letterSpacing: -2.8, lineHeight: 56 },
    progressBarBg: { height: 6, backgroundColor: '#F6F1FF', borderRadius: 3, marginVertical: 12 },
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
        position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 100 : 87,
        paddingBottom: Platform.OS === 'ios' ? 24 : 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 15,
    },
    tabItem: { alignItems: 'center', gap: 4 },
    tabItemActive: { alignItems: 'center', gap: 2, backgroundColor: '#F5F0FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
    tabIcon: { fontSize: 20, color: '#6B7280' },
    tabLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', letterSpacing: 1 },
    tabIconActive: { fontSize: 20, color: '#BEA3D8' },
    tabLabelActive: { fontSize: 10, fontWeight: '600', color: '#BEA3D8', letterSpacing: 1 },
});
