import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Alert, Platform, Animated,
} from 'react-native';
// import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ScrollView as BottomSheetScrollView } from 'react-native';
const BottomSheet = ({ children }) => <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 16 }}>{children}</View>;
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { getAddresses } from '../../api/endpoints';

const { width } = Dimensions.get('window');
const LATITUDE_DELTA = 0.012;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / 884);

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { setPickup, setDropoff } = useRide();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [savedPlaces, setSavedPlaces] = useState([]);
    const [activeTab, setActiveTab] = useState('book');
    const mapRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Required', 'Sakhi needs your location to find nearby drivers.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCurrentLocation(coords);
            setPickup({ ...coords, address: 'Current Location' });
            mapRef.current?.animateToRegion({
                ...coords, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA,
            });
        })();

        getAddresses()
            .then(({ data }) => setSavedPlaces(data.addresses || []))
            .catch(() => { });

        // Pulse animation for location pin
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const greetingName = user?.name ? user.name.split(' ')[0] : 'Priya';
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Mock recent rides
    const recentRides = [
        {
            id: 1, to: 'Worli Sea Face', from: 'Home (Bandra West)',
            date: 'Oct 24 • 09:15 AM', price: '₹450', rating: '5.0',
        },
        {
            id: 2, to: 'Jio World Drive', from: 'Work (BKC)',
            date: 'Oct 22 • 06:40 PM', price: '₹320', rating: '4.8',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Top Map Section — 58% */}
            <View style={styles.mapSection}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    initialRegion={{
                        latitude: currentLocation?.latitude || 19.0760,
                        longitude: currentLocation?.longitude || 72.8777,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                    customMapStyle={mapStyle}
                >
                    {currentLocation && (
                        <Marker coordinate={currentLocation}>
                            <View style={styles.pinWrapper}>
                                {/* Pulse rings */}
                                <Animated.View
                                    style={[styles.pulseOuter, { transform: [{ scale: pulseAnim }] }]}
                                />
                                <View style={styles.pulseInner} />
                                <View style={styles.pinDot} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Map overlay controls */}
                <View style={styles.mapOverlay}>
                    {/* Hamburger */}
                    <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/sidebar')}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>

                    {/* Search Bar */}
                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => router.push('/location-search')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.searchIcon}>🔍</Text>
                        <View style={styles.searchInput}>
                            <Text style={styles.searchPlaceholder}>Where are you going?</Text>
                        </View>
                        <Text style={styles.micIcon}>🎤</Text>
                    </TouchableOpacity>

                    {/* Profile avatar */}
                    <View style={styles.avatarBtn}>
                        <Text style={styles.avatarEmoji}>👤</Text>
                    </View>
                </View>

            </View>

            {/* Interactive Bottom Sheet (Disabled for debugging) */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
                <View style={{ alignSelf: 'center', width: 48, height: 6, backgroundColor: '#E5E0EF', borderRadius: 3, marginTop: 12, marginBottom: 12 }} />
                <BottomSheetScrollView
                    contentContainerStyle={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Row 1: Greeting & Notification */}
                    <View style={styles.greetingRow}>
                        <Text style={styles.greetingText}>
                            {getGreeting()}, {greetingName} 👋
                        </Text>
                        <TouchableOpacity
                            style={styles.notifBtn}
                            onPress={() => router.push('/notifications')}
                        >
                            <Text style={styles.notifIcon}>🔔</Text>
                            <View style={styles.notifDot} />
                        </TouchableOpacity>
                    </View>

                    {/* Row 2: Pill Tabs */}
                    <View style={styles.pillTabs}>
                        <TouchableOpacity
                            style={[styles.pillTab, activeTab === 'book' && styles.pillTabActive]}
                            onPress={() => {
                                setActiveTab('book');
                                router.push('/location-search');
                            }}
                        >
                            <Text style={[styles.pillTabText, activeTab === 'book' && styles.pillTabTextActive]}>
                                Book Now
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pillTab, activeTab === 'subscribe' && styles.pillTabActive,
                            activeTab !== 'subscribe' && styles.pillTabOutline]}
                            onPress={() => {
                                setActiveTab('subscribe');
                                router.push('/subscription-ride');
                            }}
                        >
                            <Text style={[styles.pillTabText, activeTab !== 'subscribe' && styles.pillTabTextOutline]}>
                                Subscribe
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Row 3: Saved Places Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipsRow}
                    >
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/location-search')}>
                            <Text style={styles.chipIcon}>🏠</Text>
                            <Text style={styles.chipLabel}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/location-search')}>
                            <Text style={styles.chipIcon}>💼</Text>
                            <Text style={styles.chipLabel}>Work</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/location-search')}>
                            <Text style={styles.chipIcon}>🕐</Text>
                            <Text style={styles.chipLabel}>Recent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipDashed]} onPress={() => router.push('/saved-places')}>
                            <Text style={[styles.chipIcon, { color: '#BEA3D8' }]}>+</Text>
                            <Text style={[styles.chipLabel, { color: '#BEA3D8' }]}>Add New</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Recent Rides */}
                    <View style={styles.recentSection}>
                        <View style={styles.recentHeader}>
                            <Text style={styles.recentLabel}>RECENT RIDES</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/ride-history')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentRides.map((ride) => (
                            <TouchableOpacity key={ride.id} style={styles.rideCard} onPress={() => router.push('/ride-details')}>
                                <View style={styles.rideIconBox}>
                                    <Text style={styles.rideIcon}>🚗</Text>
                                </View>
                                <View style={styles.rideInfo}>
                                    <Text style={styles.rideTo}>To: {ride.to}</Text>
                                    <Text style={styles.rideFrom}>From: {ride.from}</Text>
                                    <Text style={styles.rideDate}>{ride.date}</Text>
                                </View>
                                <View style={styles.rideRight}>
                                    <Text style={styles.ridePrice}>{ride.price}</Text>
                                    <View style={styles.rideRatingRow}>
                                        <Text style={styles.rideStar}>⭐</Text>
                                        <Text style={styles.rideRating}>{ride.rating}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </BottomSheetScrollView>
            </View>
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f6f1ff' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#4a4455' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f6f1ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dcd8e6' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ccc3d8' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8ddff' }] },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Map section — full background
    mapSection: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F6F1FF',
    },

    // Location pin
    pinWrapper: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseOuter: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 9999,
        backgroundColor: 'rgba(190, 163, 216, 0.2)',
    },
    pulseInner: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 9999,
        backgroundColor: 'rgba(190, 163, 216, 0.3)',
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 9999,
        backgroundColor: '#BEA3D8',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },

    // Map overlay controls
    mapOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 52 : 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },

    // Hamburger — 48px white circle
    menuBtn: {
        width: 48,
        height: 48,
        borderRadius: 9999,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    menuIcon: {
        fontSize: 16,
        color: '#BEA3D8',
    },

    // Search bar — white pill
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        marginHorizontal: 12,
        paddingHorizontal: 16,
        gap: 12,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    searchIcon: {
        fontSize: 16,
        opacity: 0.6,
    },
    searchInput: {
        flex: 1,
    },
    searchPlaceholder: {
        fontSize: 14,
        fontWeight: '700',
        color: '#7B7487',
        lineHeight: 17,
    },
    micIcon: {
        fontSize: 16,
        opacity: 0.6,
    },

    // Profile avatar — 48px circle
    avatarBtn: {
        width: 48,
        height: 48,
        borderRadius: 9999,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    avatarEmoji: {
        fontSize: 22,
    },

    // SOS button
    sosBtn: {
        position: 'absolute',
        left: 24,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 9999,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    sosText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },

    // Interactive Bottom Sheet Overrides
    bottomSheetShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 8,
    },
    sheetContent: {
        paddingTop: 16,
        paddingBottom: 120,
    },

    // Greeting row
    greetingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C1A25',
        letterSpacing: -0.6,
        lineHeight: 32,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifIcon: {
        fontSize: 18,
        color: '#4A4455',
    },
    notifDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 9999,
        backgroundColor: '#BEA3D8',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },

    // Pill tabs
    pillTabs: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    pillTab: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillTabActive: {
        backgroundColor: '#BEA3D8',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    pillTabOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#BEA3D8',
    },
    pillTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    pillTabTextActive: {
        color: '#FFFFFF',
    },
    pillTabTextOutline: {
        color: '#BEA3D8',
    },

    // Saved places chips
    chipsRow: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F6F1FF',
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(229, 224, 239, 0.3)',
        marginRight: 12,
        gap: 8,
    },
    chipDashed: {
        borderStyle: 'dashed',
        borderColor: 'rgba(190, 163, 216, 0.4)',
    },
    chipIcon: {
        fontSize: 14,
        color: '#BEA3D8',
    },
    chipLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A4455',
        lineHeight: 20,
    },

    // Recent rides
    recentSection: {
        paddingHorizontal: 24,
        gap: 16,
        marginTop: 28,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#7B7487',
        letterSpacing: 1.65,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#BEA3D8',
        lineHeight: 16,
    },

    // Ride card — #F6F1FF, radius 16
    rideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F6F1FF',
        borderRadius: 16,
        gap: 16,
    },
    rideIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(190, 163, 216, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rideIcon: {
        fontSize: 18,
    },
    rideInfo: {
        flex: 1,
    },
    rideTo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1A25',
        lineHeight: 20,
    },
    rideFrom: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4A4455',
        lineHeight: 16,
    },
    rideDate: {
        fontSize: 10,
        fontWeight: '700',
        color: '#7B7487',
        lineHeight: 15,
        marginTop: 4,
    },
    rideRight: {
        alignItems: 'flex-end',
        gap: 4.5,
    },
    ridePrice: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1C1A25',
        lineHeight: 20,
    },
    rideRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rideStar: {
        fontSize: 10,
        color: '#EAB308',
    },
    rideRating: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4A4455',
        lineHeight: 15,
    },
});
