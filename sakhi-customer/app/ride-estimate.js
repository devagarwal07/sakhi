import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';

const { width } = Dimensions.get('window');

export default function RideEstimateScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const [breakdownExpanded, setBreakdownExpanded] = useState(true);
    const [modal, setModal] = useState(null);

    // Mock route coordinates
    const routeCoordinates = [
        { latitude: 28.5494, longitude: 77.2001 },
        { latitude: 28.5286, longitude: 77.2189 },
    ];

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
                                {ride?.pickup?.address || '12, Green Park Avenue, New Delhi'}
                            </Text>
                            <Text style={styles.dropoffText} numberOfLines={1}>
                                {ride?.dropoff?.address || 'Hauz Khas Social, New Delhi'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/location-search')}>
                            <Text style={{ fontSize: 16, transform: [{ rotate: '-45deg' }] }}>✏️</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Map Section */}
                <View style={styles.mapArea}>
                    <MapView
                        style={StyleSheet.absoluteFill}
                        provider={PROVIDER_GOOGLE}
                        showsUserLocation={false}
                        initialRegion={{
                            latitude: 28.5390,
                            longitude: 77.2095,
                            latitudeDelta: 0.04,
                            longitudeDelta: 0.04,
                        }}
                        customMapStyle={mapStyle}
                    >
                        <Marker coordinate={routeCoordinates[0]}>
                            <View style={styles.mapStartMarker} />
                        </Marker>
                        <Marker coordinate={routeCoordinates[1]}>
                            <View style={styles.mapEndMarker} />
                        </Marker>
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#BEA3D8"
                            strokeWidth={4}
                        />
                    </MapView>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
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
                            <Text style={styles.priceText}>₹85 - ₹110</Text>
                            <Text style={styles.timeText}>12 mins away</Text>
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
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Base Fare</Text>
                                <Text style={styles.breakdownValue}>₹30</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Distance (3.2 km)</Text>
                                <Text style={styles.breakdownValue}>₹55</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Waiting (if any)</Text>
                                <Text style={styles.breakdownValue}>₹0</Text>
                            </View>
                        </View>
                    )}

                </View>

            </ScrollView>

            {/* Footer Action Button Wrapper (Sticky) */}
            <View style={styles.footerSticky}>
                <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => router.push('/ride-finding')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.bookText}>Book Auto  ›</Text>
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
        gap: 4,
        width: 12,
    },
    solidDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#BEA3D8',
    },
    dotLine: {
        width: 2,
        height: 16,
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
        gap: 0,
        justifyContent: 'center',
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
        padding: 8,
    },

    // Map Area
    mapArea: {
        height: 236,
        width: '100%',
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
