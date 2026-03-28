import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Image, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function ActiveTripScreen() {
    const router = useRouter();

    // Map Coordinates
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
                    <Marker coordinate={coords} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.driverIconOuter}>
                            <View style={styles.driverIconInner}>
                                <Text style={{ fontSize: 18 }}>🛺</Text>
                            </View>
                        </View>
                    </Marker>
                </MapView>
            </View>

            {/* Top Navigation AppBar (Floating Overlay) */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navCircleBtn}>
                    <Text style={styles.navIconArrow}>←</Text>
                </TouchableOpacity>

                <View style={styles.topStatusPill}>
                    <Text style={styles.topStatusText}>Vehicle En Route</Text>
                </View>

                <TouchableOpacity style={styles.navCircleBtn}>
                    <Text style={styles.navDots}>⋮</Text>
                </TouchableOpacity>
            </View>

            {/* Floating Map Controls */}
            <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn}>
                    <Text style={styles.mapControlIcon}>🎯</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlBtn}>
                    <Text style={styles.mapControlIcon}>🗺️</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Overlay (38% Height) */}
            <View style={styles.bottomSheetWrapper}>
                <View style={styles.dragHandle} />
                
                <ScrollView 
                    contentContainerStyle={styles.bottomSheet}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Status Row */}
                    <View style={styles.statusRow}>
                        <View style={styles.statusDotGreen} />
                        <Text style={styles.statusRowText}>TRIP IN PROGRESS</Text>
                    </View>

                    {/* Primary ETA Info */}
                    <TouchableOpacity style={styles.etaSection} onPress={() => router.replace('/ride-summary')} activeOpacity={0.8}>
                        <View style={styles.etaIconWrapper}>
                            <Text style={styles.etaIcon}>⏱</Text>
                        </View>
                        <View style={styles.etaTextCol}>
                            <Text style={styles.etaLargeText} numberOfLines={1}>Reaching Destination in 9 mins</Text>
                            <Text style={styles.etaSubText}>4.1 km remaining</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Driver Profile Card */}
                    <View style={styles.driverCard}>
                        <View style={styles.driverProfileGrp}>
                            <View style={styles.avatarWrapper}>
                                <Image 
                                    source={{ uri: 'https://i.pravatar.cc/150?img=47' }} 
                                    style={styles.avatarImage} 
                                />
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingStar}>★</Text>
                                    <Text style={styles.ratingText}>4.9</Text>
                                </View>
                            </View>
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>Meena R.</Text>
                                <Text style={styles.driverVehicle}>MH 01 AB 1234 • White Swift</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.callBtn}>
                            <Text style={styles.callIcon}>📞</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Safety Actions */}
                    <View style={styles.safetyActionsRow}>
                        <TouchableOpacity style={styles.shareBtn}>
                            <Text style={styles.shareIcon}>🔗</Text>
                            <Text style={styles.shareText}>Share Trip</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.sosBtn}>
                            <Text style={styles.sosIcon}>✱</Text>
                            <Text style={styles.sosText}>SOS</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 }} /> {/* Padding for tab bar */}
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

        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FCF8FF' },

    // Map Area
    mapArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '38%' },
    driverIconOuter: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#BEA3D8', borderWidth: 4, borderColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
    },
    driverIconInner: {
        alignItems: 'center', justifyContent: 'center',
    },

    // Floating Top Nav
    topNav: {
        position: 'absolute', top: Platform.OS === 'ios' ? 44 : 20, left: 0, right: 0,
        height: 60, paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10,
    },
    navCircleBtn: { 
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    navIconArrow: { fontSize: 20, color: '#BEA3D8' },
    navDots: { fontSize: 20, color: '#BEA3D8', marginTop: -4 },
    topStatusPill: {
        flex: 1, marginHorizontal: 16, height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    topStatusText: { fontSize: 14, fontWeight: '600', color: '#BEA3D8', letterSpacing: -0.35 },

    // Floating Map Controls
    mapControls: {
        position: 'absolute', right: 16, top: Platform.OS === 'ios' ? 120 : 96,
        gap: 12, zIndex: 10,
    },
    mapControlBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 4,
    },
    mapControlIcon: { fontSize: 20, color: '#BEA3D8' },

    // Bottom Sheet Overlay
    bottomSheetWrapper: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? '38%' : '42%', // Tighter layout
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.12, shadowRadius: 48, elevation: 16,
    },
    dragHandle: { width: 48, height: 6, backgroundColor: '#E5E0EF', borderRadius: 3, alignSelf: 'center', marginTop: 12 },
    bottomSheet: {
        paddingTop: 8,
        paddingHorizontal: 24,
        paddingBottom: 96,
    },

    // Status Row
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    statusDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
    statusRowText: { fontSize: 11, fontWeight: '700', color: '#16A34A', letterSpacing: 1.1, textTransform: 'uppercase' },

    // Primary ETA
    etaSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
    etaIconWrapper: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(190, 163, 216, 0.05)',
        alignItems: 'center', justifyContent: 'center'
    },
    etaIcon: { fontSize: 20, color: '#BEA3D8' },
    etaTextCol: { flex: 1 },
    etaLargeText: { fontSize: 20, fontWeight: '800', color: '#1C1A25', letterSpacing: -0.75 },
    etaSubText: { fontSize: 14, fontWeight: '500', color: '#4A4455' },

    // Driver Profile Card
    driverCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F6F1FF', borderRadius: 16, padding: 16, marginBottom: 24,
    },
    driverProfileGrp: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrapper: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#FFFFFF' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
    ratingBadge: {
        position: 'absolute', right: -4, bottom: -4, flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: '#BEA3D8', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 6, shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
    },
    ratingStar: { fontSize: 8, color: '#FFFFFF' },
    ratingText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
    driverDetails: { gap: 2 },
    driverName: { fontSize: 16, fontWeight: '700', color: '#1C1A25' },
    driverVehicle: { fontSize: 12, fontWeight: '500', color: '#4A4455' },
    callBtn: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#BEA3D8',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    callIcon: { fontSize: 18, color: '#FFFFFF' },

    // Safety Actions
    safetyActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
    shareBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 52, borderRadius: 12, backgroundColor: '#E8DDFF'
    },
    shareIcon: { fontSize: 16, color: '#BEA3D8' },
    shareText: { fontSize: 14, fontWeight: '700', color: '#BEA3D8' },
    
    sosBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 52, borderRadius: 12, backgroundColor: '#FEE2E2',
    },
    sosIcon: { fontSize: 16, color: '#BA1A1A' },
    sosText: { fontSize: 14, fontWeight: '700', color: '#BA1A1A' },

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
