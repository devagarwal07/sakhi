import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Alert, Animated, PanResponder, Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { StatusBar } from 'react-native';
import { ANDROID_STATUS_BAR_HEIGHT } from '../../utils/androidUtils';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { getAddresses, getRideHistory } from '../../api/endpoints';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

async function reverseGeocode(latitude, longitude) {
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            // Use the formatted_address of the first (most precise) result
            return data.results[0].formatted_address;
        }
    } catch (_) {}
    return 'Current Location';
}

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
    const [isExpanded, setIsExpanded] = useState(false);
    const mapRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Custom Bottom Sheet Animation
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const SNAP_BOTTOM = SCREEN_HEIGHT * 0.58; // 42% height exposed (100 - 58)
    const SNAP_TOP = SCREEN_HEIGHT * 0.15;    // 85% height exposed (100 - 15)
    
    const sheetAnim = useRef(new Animated.Value(SNAP_BOTTOM)).current;
    
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only handle vertical drags
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                sheetAnim.setOffset(sheetAnim._value);
                sheetAnim.setValue(0);
            },
            onPanResponderMove: Animated.event([null, { dy: sheetAnim }], { useNativeDriver: false }),
            onPanResponderRelease: (_, gestureState) => {
                sheetAnim.flattenOffset();
                const isDraggingDown = gestureState.vy > 0.5 || gestureState.dy > 50;
                const isDraggingUp = gestureState.vy < -0.5 || gestureState.dy < -50;
                
                let target = sheetAnim._value;
                if (isDraggingDown) target = SNAP_BOTTOM;
                else if (isDraggingUp) target = SNAP_TOP;
                else target = sheetAnim._value > (SNAP_TOP + SNAP_BOTTOM) / 2 ? SNAP_BOTTOM : SNAP_TOP;

                Animated.spring(sheetAnim, {
                    toValue: Math.max(SNAP_TOP, Math.min(target, SNAP_BOTTOM)),
                    useNativeDriver: false,
                    bounciness: 8,
                }).start(() => {
                    setIsExpanded(target === SNAP_TOP);
                });
            },
        })
    ).current;

    const [recentRides, setRecentRides] = useState([]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Required', 'Sakhi needs your location to find nearby drivers.');
                return;
            }

            let coords = null;
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            } catch (_) {
                // GPS off at device level — try last known position
                try {
                    const last = await Location.getLastKnownPositionAsync();
                    if (last) coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
                } catch (__) {}
            }

            if (coords) {
                setCurrentLocation(coords);
                const address = await reverseGeocode(coords.latitude, coords.longitude);
                setPickup({ ...coords, address });
                mapRef.current?.animateToRegion({
                    ...coords, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA,
                });
            }
        })();

        getAddresses()
            .then(({ data }) => setSavedPlaces(data.addresses || []))
            .catch(() => {});

        // Load real recent rides from API
        getRideHistory(1)
            .then(({ data }) => {
                const rides = data.rides || data.data || [];
                setRecentRides(rides.slice(0, 3));
            })
            .catch(() => setRecentRides([]));

        // Pulse animation for location pin
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const greetingName = user?.name ? user.name.split(' ')[0] : 'there';
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

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
                        <View style={styles.searchIcon}>
                            <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <Path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="#BEA3D8" fillOpacity="0.6"/>
                            </Svg>
                        </View>
                        <View style={styles.searchInput}>
                            <Text style={styles.searchPlaceholder}>Where are you going?</Text>
                        </View>
                        <View style={styles.micIcon}>
                            <Svg width="14" height="19" viewBox="0 0 14 19" fill="none">
                                <Path d="M7 12C6.16667 12 5.45833 11.7083 4.875 11.125C4.29167 10.5417 4 9.83333 4 9V3C4 2.16667 4.29167 1.45833 4.875 0.875C5.45833 0.291667 6.16667 0 7 0C7.83333 0 8.54167 0.291667 9.125 0.875C9.70833 1.45833 10 2.16667 10 3V9C10 9.83333 9.70833 10.5417 9.125 11.125C8.54167 11.7083 7.83333 12 7 12ZM6 19V15.925C4.26667 15.6917 2.83333 14.9167 1.7 13.6C0.566667 12.2833 0 10.75 0 9H2C2 10.3833 2.4875 11.5625 3.4625 12.5375C4.4375 13.5125 5.61667 14 7 14C8.38333 14 9.5625 13.5125 10.5375 12.5375C11.5125 11.5625 12 10.3833 12 9H14C14 10.75 13.4333 12.2833 12.3 13.6C11.1667 14.9167 9.73333 15.6917 8 15.925V19H6ZM7 10C7.28333 10 7.52083 9.90417 7.7125 9.7125C7.90417 9.52083 8 9.28333 8 9V3C8 2.71667 7.90417 2.47917 7.7125 2.2875C7.52083 2.09583 7.28333 2 7 2C6.71667 2 6.47917 2.09583 6.2875 2.2875C6.09583 2.47917 6 2.71667 6 3V9C6 9.28333 6.09583 9.52083 6.2875 9.7125C6.47917 9.90417 6.71667 10 7 10Z" fill="#BEA3D8" fillOpacity="0.6"/>
                            </Svg>
                        </View>
                    </TouchableOpacity>

                    {/* Profile avatar */}
                    <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
                        <Text style={styles.avatarEmoji}>👤</Text>
                    </TouchableOpacity>
                </View>

            </View>

            {/* Interactive Bottom Sheet */}
            <Animated.View 
                {...panResponder.panHandlers}
                style={[
                    styles.bottomSheetShadow, 
                    { 
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: SCREEN_HEIGHT,
                        backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
                        transform: [{ translateY: sheetAnim }]
                    }
                ]}
            >
                <View style={{ width: '100%', alignItems: 'center', backgroundColor: 'transparent', paddingBottom: 12 }}>
                    <View style={{ backgroundColor: '#E5E0EF', width: 48, height: 6, borderRadius: 3, marginTop: 12 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    scrollEnabled={isExpanded}
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
                            <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                <Path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#64748B"/>
                            </Svg>
                            <View style={styles.notifDot} />
                        </TouchableOpacity>
                    </View>

                    {/* Row 2: Pill Tabs */}
                    <View style={styles.pillTabs}>
                        <TouchableOpacity
                            style={[styles.pillTab, activeTab === 'book' && styles.pillTabActive,
                            activeTab !== 'book' && styles.pillTabOutline]}
                            onPress={() => {
                                setActiveTab('book');
                                router.push('/location-search');
                            }}
                        >
                            <Text style={[styles.pillTabText, activeTab === 'book' && styles.pillTabTextActive,
                            activeTab !== 'book' && styles.pillTabTextOutline]}>
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
                        <TouchableOpacity style={[styles.chip, styles.chipIcon]} onPress={() => router.push('/location-search')}>
                            <Svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                                <Path d="M1.5 12H3.75V7.5H8.25V12H10.5V5.25L6 1.875L1.5 5.25V12ZM0 13.5V4.5L6 0L12 4.5V13.5H6.75V9H5.25V13.5H0Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={[styles.chipLabel]}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipIcon]} onPress={() => router.push('/location-search')}>
                            <Svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                <Path d="M1.5 14.25C1.0875 14.25 0.734375 14.1031 0.440625 13.8094C0.146875 13.5156 0 13.1625 0 12.75V4.5C0 4.0875 0.146875 3.73438 0.440625 3.44062C0.734375 3.14687 1.0875 3 1.5 3H4.5V1.5C4.5 1.0875 4.64688 0.734375 4.94063 0.440625C5.23438 0.146875 5.5875 0 6 0H9C9.4125 0 9.76562 0.146875 10.0594 0.440625C10.3531 0.734375 10.5 1.0875 10.5 1.5V3H13.5C13.9125 3 14.2656 3.14687 14.5594 3.44062C14.8531 3.73438 15 4.0875 15 4.5V12.75C15 13.1625 14.8531 13.5156 14.5594 13.8094C14.2656 14.1031 13.9125 14.25 13.5 14.25H1.5ZM1.5 12.75H13.5V4.5H1.5V12.75ZM6 3H9V1.5H6V3ZM1.5 12.75V4.5V12.75Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={styles.chipLabel}>Work</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, styles.chipIcon]} onPress={() => router.push('/location-search')}>
                            <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <Path d="M6.75 13.5C5.025 13.5 3.52187 12.9281 2.24062 11.7844C0.959375 10.6406 0.225 9.2125 0.0375 7.5H1.575C1.75 8.8 2.32812 9.875 3.30938 10.725C4.29063 11.575 5.4375 12 6.75 12C8.2125 12 9.45312 11.4906 10.4719 10.4719C11.4906 9.45312 12 8.2125 12 6.75C12 5.2875 11.4906 4.04688 10.4719 3.02813C9.45312 2.00938 8.2125 1.5 6.75 1.5C5.8875 1.5 5.08125 1.7 4.33125 2.1C3.58125 2.5 2.95 3.05 2.4375 3.75H4.5V5.25H0V0.75H1.5V2.5125C2.1375 1.7125 2.91562 1.09375 3.83437 0.65625C4.75312 0.21875 5.725 0 6.75 0C7.6875 0 8.56562 0.178125 9.38437 0.534375C10.2031 0.890625 10.9156 1.37188 11.5219 1.97812C12.1281 2.58437 12.6094 3.29688 12.9656 4.11562C13.3219 4.93437 13.5 5.8125 13.5 6.75C13.5 7.6875 13.3219 8.56562 12.9656 9.38437C12.6094 10.2031 12.1281 10.9156 11.5219 11.5219C10.9156 12.1281 10.2031 12.6094 9.38437 12.9656C8.56562 13.3219 7.6875 13.5 6.75 13.5ZM8.85 9.9L6 7.05V3H7.5V6.45L9.9 8.85L8.85 9.9Z" fill="#BEA3D8"/>
                            </Svg>
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
                            <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentRides.length === 0 ? (
                            <Text style={styles.rideFrom}>No recent rides yet.</Text>
                        ) : recentRides.map((ride) => {
                            const dropAddress = ride.dropoff_address || ride.dropoff?.address || ride.to || '—';
                            const pickAddress = ride.pickup_address || ride.pickup?.address || ride.from || '—';
                            const rideDate = ride.created_at
                                ? new Date(ride.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : (ride.date || '');
                            const fare = ride.fare?.total ? `₹${ride.fare.total}` : (ride.price || '');
                            const rating = ride.rating?.toFixed(1) || ride.rating || '';
                            return (
                            <TouchableOpacity key={ride.id || ride._id} style={styles.rideCard} onPress={() => router.push({ pathname: '/ride-details', params: { rideId: ride.id || ride._id } })}>
                                <View style={styles.rideIconBox}>
                                    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <Path d="M3 16V17C3 17.2833 2.90417 17.5208 2.7125 17.7125C2.52083 17.9042 2.28333 18 2 18H1C0.716667 18 0.479167 17.9042 0.2875 17.7125C0.0958333 17.5208 0 17.2833 0 17V9L2.1 3C2.2 2.7 2.37917 2.45833 2.6375 2.275C2.89583 2.09167 3.18333 2 3.5 2H6V0H12V2H14.5C14.8167 2 15.1042 2.09167 15.3625 2.275C15.6208 2.45833 15.8 2.7 15.9 3L18 9V17C18 17.2833 17.9042 17.5208 17.7125 17.7125C17.5208 17.9042 17.2833 18 17 18H16C15.7167 18 15.4792 17.9042 15.2875 17.7125C15.0958 17.5208 15 17.2833 15 17V16H3ZM2.8 7H15.2L14.15 4H3.85L2.8 7ZM2 9V14V9ZM4.5 13C4.91667 13 5.27083 12.8542 5.5625 12.5625C5.85417 12.2708 6 11.9167 6 11.5C6 11.0833 5.85417 10.7292 5.5625 10.4375C5.27083 10.1458 4.91667 10 4.5 10C4.08333 10 3.72917 10.1458 3.4375 10.4375C3.14583 10.7292 3 11.0833 3 11.5C3 11.9167 3.14583 12.2708 3.4375 12.5625C3.72917 12.8542 4.08333 13 4.5 13ZM13.5 13C13.9167 13 14.2708 12.8542 14.5625 12.5625C14.8542 12.2708 15 11.9167 15 11.5C15 11.0833 14.8542 10.7292 14.5625 10.4375C14.2708 10.1458 13.9167 10 13.5 10C13.0833 10 12.7292 10.1458 12.4375 10.4375C12.1458 10.7292 12 11.0833 12 11.5C12 11.9167 12.1458 12.2708 12.4375 12.5625C12.7292 12.8542 13.0833 13 13.5 13ZM2 14H16V9H2V14Z" fill="#BEA3D8"/>
                                    </Svg>
                                </View>
                                <View style={styles.rideInfo}>
                                    <Text style={styles.rideTo} numberOfLines={1}>To: {dropAddress}</Text>
                                    <Text style={styles.rideFrom} numberOfLines={1}>From: {pickAddress}</Text>
                                    <Text style={styles.rideDate}>{rideDate}</Text>
                                </View>
                                <View style={styles.rideRight}>
                                    <Text style={styles.ridePrice}>{fare}</Text>
                                    {!!rating && (
                                        <View style={styles.rideRatingRow}>
                                            <Svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <Path d="M1.9125 9.5L2.725 5.9875L0 3.625L3.6 3.3125L5 0L6.4 3.3125L10 3.625L7.275 5.9875L8.0875 9.5L5 7.6375L1.9125 9.5Z" fill="#EAB308"/>
                                            </Svg>
                                            <Text style={styles.rideRating}>{rating}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#F5F0FF' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F0FF' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#F1F5F9' }] },
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
        backgroundColor: '#F5F0FF',
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
        top: Platform.OS === 'ios' ? 52 : ANDROID_STATUS_BAR_HEIGHT + 12,
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
        width: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
    },
    searchInput: {
        flex: 1,
    },
    searchPlaceholder: {
        fontSize: 15,
        fontWeight: '700',
        color: '#94A3B8',
        lineHeight: 20,
    },
    micIcon: {
        width: 18,
        alignItems: 'center',
        justifyContent: 'center',
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
    // Note: shadows via shadowColor only show on iOS. Android uses elevation (set above).
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
        color: '#1E1B2E',
        letterSpacing: -0.6,
        lineHeight: 32,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
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
        backgroundColor: '#F5F0FF',
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
        color: '#64748B',
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
        color: '#94A3B8',
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
        backgroundColor: '#F5F0FF',
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
        color: '#1E1B2E',
        lineHeight: 20,
    },
    rideFrom: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        lineHeight: 16,
    },
    rideDate: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
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
        color: '#1E1B2E',
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
        color: '#64748B',
        lineHeight: 15,
    },
});
