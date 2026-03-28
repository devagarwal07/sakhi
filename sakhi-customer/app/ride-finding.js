import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Animated, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRide } from '../src/context/RideContext';

const { width } = Dimensions.get('window');

export default function RideFindingScreen() {
    const router = useRouter();
    const { ride } = useRide();

    // Reanimated pulses for the center pin
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const pulse3 = useRef(new Animated.Value(0)).current;

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

        // Dummy timeout to simulate finding driver
        const timer = setTimeout(() => {
            router.replace('/trip-status');
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Map Area (Top 55%) */}
            <View style={styles.mapArea}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: 12.9716, // Bangalore fallback
                        longitude: 77.5946,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    customMapStyle={mapStyle}
                    showsUserLocation={false}
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
                        <Text style={{ fontSize: 24, color: '#8C37DD' }}>📍</Text>
                    </View>
                </View>
            </View>

            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navIconBtn}>
                    <Text style={styles.navIconText}>←</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navIconBtn}>
                    <Text style={styles.navDots}>⋮</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet (Bottom 45%) */}
            <View style={styles.bottomSheet}>
                {/* Floating Badge overlapping map and sheet */}
                <View style={styles.badgeWrapper}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeIcon}>🚚</Text>
                    </View>
                </View>

                {/* Content */}
                <ScrollView 
                    contentContainerStyle={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Titles */}
                    <View style={styles.headerTitles}>
                        <Text style={styles.titleText}>Finding Your Driver...</Text>
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
                                    {ride?.pickup?.address || '12, Green Park Avenue, New Delhi'}
                                </Text>
                            </View>
                        </View>

                        {/* Drop */}
                        <View style={styles.row}>
                            <View style={styles.iconCol}>
                                <Text style={styles.dropPin}>📍</Text>
                            </View>
                            <View style={styles.textCol}>
                                <Text style={styles.label}>DROP</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {ride?.dropoff?.address || 'Hauz Khas Social, New Delhi'}
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
                
                {/* Fade out over content & Optional Cancel Button */}
                <View style={styles.fadeBottom} />
            </View>
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#fcf8ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCF8FF',
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
        height: Platform.OS === 'ios' ? 108 : 64, // Accounts for notch implicitly using paddings later if needed, but going absolute
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
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
        backgroundColor: '#F6F1FF',
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
        // Could place a cancel button here explicitly if needed!
    }
});
