import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Alert,
    Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Colors, BorderRadius, Shadows } from '../../utils/theme';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { getAddresses } from '../../api/endpoints';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.012;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { setPickup, setDropoff } = useRide();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [savedPlaces, setSavedPlaces] = useState([]);
    const mapRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Required',
                    'Sakhi needs your location to find nearby drivers. Please enable location access.',
                );
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setCurrentLocation(coords);
            setPickup({ ...coords, address: 'Current Location' });

            mapRef.current?.animateToRegion({
                ...coords,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });
        })();

        // Load saved addresses
        getAddresses()
            .then(({ data }) => setSavedPlaces(data.addresses || []))
            .catch(() => { });
    }, []);

    const handleWhereToPress = () => {
        router.push('/location-search');
    };

    const greetingName = user?.name ? user.name.split(' ')[0] : 'there';

    return (
        <View style={styles.container}>
            {/* Full-screen Map */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={false}
                showsMyLocationButton={false}
                initialRegion={{
                    latitude: currentLocation?.latitude || 12.9716,
                    longitude: currentLocation?.longitude || 77.5946,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                }}
                customMapStyle={mapStyle}
            >
                {currentLocation && (
                    <Marker coordinate={currentLocation}>
                        <View style={styles.userMarker}>
                            <View style={styles.userMarkerInner} />
                            <View style={styles.userMarkerPulse} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.topBarCard}>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => router.push('/profile')}
                    >
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={styles.greetingBlock}>
                        <Text style={styles.greetingText}>Good morning, {greetingName} 👋</Text>
                        <Text style={styles.greetingSubtext}>Where are you going today?</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.notifBtn}
                        onPress={() => router.push('/notifications')}
                    >
                        <Text style={styles.notifIcon}>🔔</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Booking Sheet */}
            <View style={styles.bottomSheet}>
                {/* Where to? */}
                <TouchableOpacity
                    style={styles.whereToCard}
                    onPress={handleWhereToPress}
                    activeOpacity={0.85}
                >
                    <View style={styles.whereToRow}>
                        <View style={styles.dotColumn}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dotLine} />
                            <View style={styles.dotViolet} />
                        </View>
                        <View style={styles.whereToInputs}>
                            <View style={styles.locationInput}>
                                <Text style={styles.locationInputLabel} numberOfLines={1}>
                                    {currentLocation ? 'Current Location' : 'Getting your location…'}
                                </Text>
                            </View>
                            <View style={styles.inputDivider} />
                            <View style={[styles.locationInput, styles.destinationInput]}>
                                <Text style={styles.destinationPlaceholder}>Where to?</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Saved Places Chips */}
                {savedPlaces.length > 0 && (
                    <>
                        <Text style={styles.savedPlacesLabel}>Saved Places</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                            {savedPlaces.map((place) => (
                                <TouchableOpacity
                                    key={place.id}
                                    style={styles.chip}
                                    onPress={() => {
                                        setDropoff({
                                            latitude: place.latitude,
                                            longitude: place.longitude,
                                            address: place.address,
                                        });
                                        router.push('/ride-estimate');
                                    }}
                                >
                                    <Text style={styles.chipIcon}>
                                        {place.type === 'home' ? '🏠' : place.type === 'work' ? '💼' : '📍'}
                                    </Text>
                                    <Text style={styles.chipLabel}>{place.label || place.type}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Quick actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/subscriptions')}
                    >
                        <View style={styles.quickActionIcon}>
                            <Text style={{ fontSize: 20 }}>🔄</Text>
                        </View>
                        <Text style={styles.quickActionLabel}>Subscription</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/ride-history')}
                    >
                        <View style={styles.quickActionIcon}>
                            <Text style={{ fontSize: 20 }}>📋</Text>
                        </View>
                        <Text style={styles.quickActionLabel}>History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => router.push('/safety')}
                    >
                        <View style={[styles.quickActionIcon, styles.sosQuickIcon]}>
                            <Text style={{ fontSize: 20 }}>🛡️</Text>
                        </View>
                        <Text style={styles.quickActionLabel}>Safety</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// Minimal light map style (pink/lavender tones to match brand)
const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#4a4455' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ebe6f5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dcd8e6' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ccc3d8' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8ddff' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 52,
        paddingHorizontal: 16,
    },
    topBarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(252,248,255,0.95)',
        borderRadius: 16,
        padding: 12,
        gap: 12,
        ...Shadows.card,
    },
    menuBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuIcon: { fontSize: 18, color: Colors.onSurfaceVariant },
    greetingBlock: { flex: 1 },
    greetingText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.onBackground,
    },
    greetingSubtext: {
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        marginTop: 1,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifIcon: { fontSize: 16 },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
        ...Shadows.editorial,
    },
    whereToCard: {
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
    },
    whereToRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    dotColumn: { alignItems: 'center', gap: 4, paddingVertical: 4 },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
    dotLine: { width: 2, height: 20, backgroundColor: Colors.outlineVariant },
    dotViolet: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryContainer },
    whereToInputs: { flex: 1 },
    locationInput: { paddingVertical: 6 },
    locationInputLabel: { fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '500' },
    inputDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 4 },
    destinationInput: {},
    destinationPlaceholder: {
        fontSize: 15,
        color: Colors.outline,
        fontWeight: '500',
    },
    savedPlacesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    chipsRow: { marginBottom: 16 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.full,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 8,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
    },
    chipIcon: { fontSize: 14 },
    chipLabel: { fontSize: 13, color: Colors.onSurface, fontWeight: '500' },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    quickAction: { alignItems: 'center', gap: 6 },
    quickActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
    },
    sosQuickIcon: {
        backgroundColor: '#fff1f2',
        borderColor: '#fca5a5',
    },
    quickActionLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500' },
    userMarker: { alignItems: 'center', justifyContent: 'center', width: 24, height: 24 },
    userMarkerInner: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.primaryContainer,
        borderWidth: 2,
        borderColor: Colors.onPrimary,
    },
    userMarkerPulse: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
    },
});
