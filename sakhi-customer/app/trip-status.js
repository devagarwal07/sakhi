import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function TripStatusScreen() {
    const router = useRouter();

    // Mock Route
    const pickupCoords = { latitude: 28.5286, longitude: 77.2189 }; // Drop/Destination point of auto
    const driverCoords = { latitude: 28.5186, longitude: 77.2089 }; // Approaching driver

    return (
        <View style={styles.container}>
            {/* Map Area */}
            <View style={styles.mapArea}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    showsUserLocation={false}
                    initialRegion={{
                        latitude: 28.5236,
                        longitude: 77.2139,
                        latitudeDelta: 0.03,
                        longitudeDelta: 0.03,
                    }}
                    customMapStyle={mapStyle}
                >
                    {/* Dotted Route Line connecting driver to pickup */}
                    <Polyline
                        coordinates={[driverCoords, pickupCoords]}
                        strokeColor="#BEA3D8"
                        strokeWidth={4}
                        lineDashPattern={[6, 6]}
                    />

                    {/* Driver Marker */}
                    <Marker coordinate={driverCoords} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.driverMarkerWrapper}>
                            <View style={styles.driverMarker}>
                                <Text style={{ fontSize: 24 }}>🛺</Text>
                            </View>
                            <View style={styles.driverEtaBadge}>
                                <Text style={styles.driverEtaText}>4 MIN</Text>
                            </View>
                        </View>
                    </Marker>

                    {/* Pickup Marker */}
                    <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.pickupMarkerWrapper}>
                            <View style={styles.pickupMarker}>
                                <View style={styles.pickupDotInner} />
                            </View>
                            <View style={styles.pickupBadge}>
                                <Text style={styles.pickupBadgeText}>PICKUP</Text>
                            </View>
                        </View>
                    </Marker>
                </MapView>
            </View>

            {/* Top Navigation AppBar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navIconBtn}>
                    <Text style={styles.navIconArrow}>←</Text>
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Trip Status</Text>
                </View>

                <TouchableOpacity style={styles.navIconBtn}>
                    <Text style={styles.navDots}>⋮</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Modal */}
            <View style={styles.bottomSheet}>
                <View style={styles.dragHandle} />

                {/* Status Pill */}
                <TouchableOpacity style={styles.statusPillWrapper} onPress={() => router.push('/driver-arrived')} activeOpacity={0.9}>
                    <View style={styles.statusPill}>
                        <View style={styles.statusDotGreen} />
                        <Text style={styles.statusPillText}>Driver is on the way · 4 mins away</Text>
                    </View>
                </TouchableOpacity>

                {/* Driver Card Info */}
                <View style={styles.driverCard}>
                    <View style={styles.driverProfileCol}>
                        <View style={styles.avatarWrapper}>
                            <Image 
                                source={{ uri: 'https://i.pravatar.cc/150?img=47' }} 
                                style={styles.avatarImage} 
                            />
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                            </View>
                        </View>
                        <View style={styles.driverTextCol}>
                            <View style={styles.driverNameRow}>
                                <Text style={styles.driverName}>Meena R.</Text>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingStar}>★</Text>
                                    <Text style={styles.ratingText}>4.8</Text>
                                </View>
                            </View>
                            <Text style={styles.vehicleInfo}>Auto · KA 05 AB 1234</Text>
                        </View>
                    </View>

                    <View style={styles.driverActions}>
                        <TouchableOpacity style={styles.circleAction}>
                            <Text style={styles.actionIcon}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.circleAction}>
                            <Text style={styles.actionIcon}>💬</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress Stepper */}
                <View style={styles.stepperContainer}>
                    {/* Background Progress Line */}
                    <View style={styles.stepperBgLine} />
                    {/* Active Progress Line */}
                    <View style={styles.stepperActiveLine} />

                    <View style={styles.stepNodes}>
                        {/* Step 1: Assigned */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepNodeChecked}>
                                <Text style={styles.stepNodeCheckMark}>✓</Text>
                            </View>
                            <Text style={styles.stepTextGray}>Assigned</Text>
                        </View>

                        {/* Step 2: En Route (Current) */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepNodeActiveRing}>
                                <View style={styles.stepNodeActive} />
                            </View>
                            <Text style={styles.stepTextActive}>En Route</Text>
                        </View>

                        {/* Step 3: Arrived */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepNodeInactive} />
                            <Text style={styles.stepTextGray}>Arrived</Text>
                        </View>

                        {/* Step 4: Started */}
                        <View style={styles.stepItem}>
                            <View style={styles.stepNodeInactive} />
                            <Text style={styles.stepTextGray}>Started</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.shareBtn}>
                        <Text style={styles.shareIcon}>🔗</Text>
                        <Text style={styles.shareBtnText}>Share Trip</Text>
                    </TouchableOpacity>
                </View>

                {/* Dummy Tab Bar Overlay (strictly matching Figma for this mockup) */}
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
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] }, // Desaturated lavendar
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { elementType: 'labels', stylers: [{ visibility: 'off' }] }, 
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FCF8FF' },

    // Map
    mapArea: { height: '55%', width: '100%' },
    pickupMarkerWrapper: { alignItems: 'center' },
    pickupMarker: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#BEA3D8',
        borderWidth: 2, borderColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    pickupDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
    pickupBadge: {
        marginTop: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    pickupBadgeText: { fontSize: 10, fontWeight: '700', color: '#1C1A25', letterSpacing: 0.5 },
    
    driverMarkerWrapper: { alignItems: 'center' },
    driverMarker: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: '#AB8FFE',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6,
    },
    driverEtaBadge: {
        marginTop: -6, zIndex: 5, backgroundColor: '#BEA3D8', paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 9999,
    },
    driverEtaText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },

    // Top Nav
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 108 : 80,
        paddingTop: Platform.OS === 'ios' ? 52 : 24,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
        zIndex: 10,
    },
    navIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    navIconArrow: { fontSize: 24, color: '#BEA3D8' },
    navDots: { fontSize: 24, color: '#BEA3D8', marginTop: -6 },
    titleContainer: { flex: 1, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45 },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: '45%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 12,
    },
    dragHandle: { width: 48, height: 6, backgroundColor: '#E5E0EF', borderRadius: 3, alignSelf: 'center', marginTop: 12 },
    
    statusPillWrapper: { alignItems: 'center', marginTop: 24 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 9999,
        paddingVertical: 6, paddingHorizontal: 16, gap: 8,
    },
    statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    statusPillText: { fontSize: 14, fontWeight: '600', color: '#BEA3D8' },

    driverCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginHorizontal: 24, marginTop: 24,
    },
    driverProfileCol: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarWrapper: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#AB8FFE' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 26 },
    verifiedBadge: {
        position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9,
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#AB8FFE', alignItems: 'center', justifyContent: 'center'
    },
    verifiedIcon: { fontSize: 10, color: '#BEA3D8', fontWeight: '900' },
    driverTextCol: { gap: 4 },
    driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    driverName: { fontSize: 18, fontWeight: '700', color: '#1E1B2E' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBE6F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
    ratingStar: { fontSize: 10, color: '#FBBF24' },
    ratingText: { fontSize: 10, fontWeight: '700', color: '#1C1A25' },
    vehicleInfo: { fontSize: 14, color: '#6B7280' },
    driverActions: { flexDirection: 'row', gap: 12 },
    circleAction: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: '#F0ECFA', alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3,
    },
    actionIcon: { fontSize: 18, color: '#BEA3D8' },

    // Stepper
    stepperContainer: { position: 'relative', marginHorizontal: 24, marginTop: 32, height: 45 },
    stepperBgLine: { position: 'absolute', top: 7, left: '10%', right: '10%', height: 2, backgroundColor: '#E5E0EF', zIndex: 0 },
    stepperActiveLine: { position: 'absolute', top: 7, left: '10%', right: '50%', height: 2, backgroundColor: '#BEA3D8', zIndex: 1 },
    stepNodes: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
    stepItem: { alignItems: 'center', width: 64, gap: 8 },
    
    stepNodeChecked: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center' },
    stepNodeCheckMark: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    stepNodeActiveRing: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(99, 14, 212, 0.2)', alignItems: 'center', justifyContent: 'center' },
    stepNodeActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#BEA3D8' },
    stepNodeInactive: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E5E0EF' },
    
    stepTextGray: { fontSize: 10, fontWeight: '500', color: '#6B7280' },
    stepTextActive: { fontSize: 10, fontWeight: '700', color: '#BEA3D8' },

    // Action Row
    actionRow: { alignItems: 'center', marginTop: 24 },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        width: 156, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#BEA3D8', gap: 8,
    },
    shareIcon: { fontSize: 16, color: '#BEA3D8' },
    shareBtnText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },

    // Dummy Tab Bar
    dummyTabBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 95,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
