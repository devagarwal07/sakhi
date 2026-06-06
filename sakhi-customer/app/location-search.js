import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Pressable, Keyboard, Platform,
    ScrollView, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { getRideHistory, getAddresses } from '../src/api/endpoints';
import { isInBengaluru } from '../src/utils/bengaluruUtils';
import { Feather } from '@expo/vector-icons';
import CustomAlert from '../src/utils/CustomAlert';
import MapplsMapWebView from '../src/components/MapplsMapWebView';

const MAPPLS_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';

// ── Mappls helpers ────────────────────────────────────────────────────────────
// Fetch an OAuth token from Mappls (needed for Atlas / Search APIs)
let _mapplsToken = null;
let _tokenExpiry = 0;
async function getMapplsToken() {
    if (_mapplsToken && Date.now() < _tokenExpiry) return _mapplsToken;
    const res = await fetch(
        `https://outpost.mappls.com/api/security/oauth/token?grant_type=client_credentials` +
        `&client_id=${process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID}` +
        `&client_secret=${encodeURIComponent(process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET)}`,
        { method: 'POST' }
    );
    const json = await res.json();
    _mapplsToken = json.access_token;
    _tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
    return _mapplsToken;
}

// Search places via Mappls Atlas autocomplete, fallback to Nominatim
async function searchPlaces(query, pickupCoords) {
    try {
        const token = await getMapplsToken();
        const bias = pickupCoords
            ? `&location=${pickupCoords.latitude},${pickupCoords.longitude}&zoom=15`
            : '';
        const url =
            `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}` +
            `&access_token=${token}&region=IND${bias}`;
        const res = await fetch(url);
        const data = await res.json();
        const suggestions = data?.suggestedLocations || data?.copResults || [];
        if (suggestions.length > 0) {
            return suggestions.map((s) => ({
                place_id: s.eLoc || s.placeId || String(Math.random()),
                eLoc: s.eLoc || null,
                main: s.placeName || s.orderIndex || query,
                secondary: s.placeAddress || s.addressTokens?.district || '',
                structured_formatting: {
                    main_text: s.placeName || query,
                    secondary_text: s.placeAddress || '',
                },
                _lat: s.latitude || null,
                _lng: s.longitude || null,
            }));
        }
    } catch (_) { }

    // Fallback: Nominatim OSM
    try {
        const bias = pickupCoords
            ? `&viewbox=${pickupCoords.longitude - 0.5},${pickupCoords.latitude + 0.5},${pickupCoords.longitude + 0.5},${pickupCoords.latitude - 0.5}&bounded=1`
            : '';
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=in${bias}`,
            { headers: { 'User-Agent': 'SakhiCustomerApp/1.0' } }
        );
        const data = await res.json();
        return (data || []).map((item) => ({
            place_id: item.place_id || String(Math.random()),
            eLoc: null,
            main: item.name || item.display_name?.split(',')[0] || query,
            secondary: item.display_name || '',
            structured_formatting: {
                main_text: item.name || item.display_name?.split(',')[0] || query,
                secondary_text: item.display_name?.split(',').slice(1, 3).join(',').trim() || '',
            },
            _lat: item.lat || null,
            _lng: item.lon || null,
        }));
    } catch (_) { }

    return [];
}

export default function LocationSearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { setDropoff, setPickup, setStop, ride } = useRide();
    const insets = useSafeAreaInsets();
    const [pickupQuery, setPickupQuery] = useState(ride?.pickup?.address || '');
    const [dropoffQuery, setDropoffQuery] = useState(ride?.dropoff?.address || '');
    const [stopQuery, setStopQuery] = useState(ride?.stop?.address || '');
    const [showStop, setShowStop] = useState(!!ride?.stop?.address);
    const [activeInput, setActiveInput] = useState('dropoff');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [recentDestinations, setRecentDestinations] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [resolving, setResolving] = useState(false);  // loading state for coordinate resolution
    const [savedPlaces, setSavedPlaces] = useState([]);
    const searchTimer = useRef(null);

    // Map drag mode state
    const [mapMode, setMapMode] = useState(false);
    const [dragAddress, setDragAddress] = useState('');
    const [dragCoords, setDragCoords] = useState(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const geoTimer = useRef(null);
    const pinBounce = useRef(new Animated.Value(0)).current;

    const returnRoute = params?.returnRoute || '/ride-estimate';
    const isSearching = (activeInput === 'pickup' ? pickupQuery : activeInput === 'stop' ? stopQuery : dropoffQuery).trim().length >= 3;

    const headerPaddingTop = Platform.OS === 'ios'
        ? insets.top
        : Math.max(insets.top, 24);
    const headerHeight = 64 + headerPaddingTop;
    const footerPaddingBottom = Math.max(insets.bottom, 24);
    const scrollPaddingBottom = 24 + 56 + footerPaddingBottom + 24;

    // Load real recent destinations from ride history
    useEffect(() => {
        getRideHistory(1)
            .then(({ data }) => {
                const rides = data.rides || data.data || [];
                // Extract unique drop-off addresses with coords
                const seen = new Set();
                const destinations = rides
                    .filter((r) => r.dropoff_address || r.dropoff?.address)
                    .filter((r) => {
                        const addr = r.dropoff_address || r.dropoff?.address;
                        if (seen.has(addr)) return false;
                        seen.add(addr);
                        return true;
                    })
                    .slice(0, 5)
                    .map((r, i) => ({
                        place_id: `recent_${i}`,
                        main: r.dropoff_address || r.dropoff?.address,
                        secondary: r.pickup_address || r.pickup?.address || '',
                        lat: r.dropoff?.latitude || null,
                        lng: r.dropoff?.longitude || null,
                    }));
                setRecentDestinations(destinations);
            })
            .catch(() => setRecentDestinations([]))
            .finally(() => setLoadingRecent(false));

        getAddresses()
            .then(({ data }) => setSavedPlaces(data.addresses || data || []))
            .catch(() => setSavedPlaces([]));
    }, []);

    // ── Reverse geocode (called on drag end) ──────────────────────────────────
    const reverseGeocode = async (lat, lng) => {
        setGeoLoading(true);
        setDragAddress('');
        try {
            // Try Mappls reverse geocode first
            try {
                const token = await getMapplsToken();
                const res = await fetch(
                    `https://atlas.mappls.com/api/places/geocode?lat=${lat}&lng=${lng}&access_token=${token}`
                );
                const data = await res.json();
                const loc = data?.copResults;
                if (loc?.formattedAddress) {
                    setDragAddress(loc.formattedAddress);
                    setDragCoords({ latitude: lat, longitude: lng });
                    return;
                }
            } catch (_) { }
            // Fallback: OSM Nominatim reverse geocode
            try {
                const osmRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                    { headers: { 'User-Agent': 'SakhiCustomerApp/1.0' } }
                );
                const osmData = await osmRes.json();
                const addr = osmData?.display_name || osmData?.address?.road || '';
                if (addr) {
                    setDragAddress(addr);
                    setDragCoords({ latitude: lat, longitude: lng });
                    return;
                }
            } catch (_) { }
            // Last resort: show raw coordinates
            setDragAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setDragCoords({ latitude: lat, longitude: lng });
        } finally {
            setGeoLoading(false);
        }
    };

    // Pin bounce animation (triggered when drag ends)
    const triggerPinBounce = () => {
        Animated.sequence([
            Animated.timing(pinBounce, { toValue: -12, duration: 120, useNativeDriver: true }),
            Animated.spring(pinBounce, { toValue: 0, friction: 4, tension: 140, useNativeDriver: true }),
        ]).start();
    };

    // Called every time the map center changes after a drag
    const handleMapDragEnd = (lat, lng) => {
        triggerPinBounce();
        setDragCoords({ latitude: lat, longitude: lng });
        // Debounce reverse geocode — only call after dragging stops
        clearTimeout(geoTimer.current);
        geoTimer.current = setTimeout(() => reverseGeocode(lat, lng), 600);
    };

    // Confirm map-selected location
    const handleMapConfirm = () => {
        if (!dragCoords) return;
        const address = dragAddress || `${dragCoords.latitude.toFixed(5)}, ${dragCoords.longitude.toFixed(5)}`;
        const shortAddress = address.split(',').slice(0, 3).join(',').trim();

        if (activeInput === 'pickup') {
            setPickup({ ...dragCoords, address: shortAddress });
            setPickupQuery(shortAddress);
        } else if (activeInput === 'stop') {
            if (!isInBengaluru(dragCoords.latitude, dragCoords.longitude)) {
                router.push({ pathname: '/bengaluru-only', params: { allowBack: 'true' } });
                return;
            }
            setStop?.({ ...dragCoords, address: shortAddress });
            setStopQuery(shortAddress);
        } else {
            if (!isInBengaluru(dragCoords.latitude, dragCoords.longitude)) {
                router.push({ pathname: '/bengaluru-only', params: { allowBack: 'true' } });
                return;
            }
            setDropoff({ ...dragCoords, address: shortAddress });
            setMapMode(false);
            router.replace(returnRoute);
            return;
        }
        setMapMode(false);
    };

    const handleSearch = (text, type = activeInput) => {
        if (type === 'pickup') setPickupQuery(text);
        if (type === 'dropoff') setDropoffQuery(text);
        if (type === 'stop') setStopQuery(text);
        setActiveInput(type);

        clearTimeout(searchTimer.current);
        if (text.trim().length < 3) { setResults([]); return; }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const results = await searchPlaces(text, ride?.pickup);
                setResults(results);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const handleSelectPlace = async (place) => {
        Keyboard.dismiss();
        try {
            let coords;
            // If result came from our Mappls search, coords might be inline
            if (place._lat && place._lng) {
                coords = { latitude: parseFloat(place._lat), longitude: parseFloat(place._lng) };
            } else if (place.lat && place.lng) {
                // Recent destinations already have coords
                coords = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lng) };
            }

            const newAddress = place.structured_formatting?.main_text || place.description || place.main || 'Selected Location';
            const secondary = place.structured_formatting?.secondary_text || place.secondary || '';
            const fullAddress = secondary ? `${newAddress}, ${secondary}` : newAddress;

            // Fallbacks for missing coordinates
            if (!coords || !coords.latitude) {
                try {
                    // Fallback 1: Mappls Routing API Hack
                    // Standard Mappls APIs mask coordinates for basic tiers, but the Route API does not!
                    const eLoc = place.eLoc || place.place_id;
                    if (eLoc && !eLoc.startsWith('recent')) {
                        const routeRes = await fetch(`https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/route_adv/driving/${eLoc};${eLoc}`);
                        const routeData = await routeRes.json();
                        if (routeData?.waypoints?.length > 0) {
                            const [lon, lat] = routeData.waypoints[0].location;
                            coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
                        }
                    }
                } catch (e) { console.error('Mappls Routing Hack Failed:', e); }
            }

            if (!coords || !coords.latitude) {
                try {
                    // Fallback 2: Mappls Geocode
                    const token = await getMapplsToken();
                    const response = await fetch(
                        `https://atlas.mappls.com/api/places/geocode?address=${encodeURIComponent(fullAddress)}&access_token=${token}`
                    );
                    const data = await response.json();
                    const loc = data?.copResults?.latitude ? data.copResults : (data?.copResults?.[0] || data?.results?.[0]);
                    if (loc && loc.latitude && loc.longitude) {
                        coords = { latitude: parseFloat(loc.latitude), longitude: parseFloat(loc.longitude) };
                    }
                } catch (e) { }
            }

            if (!coords || !coords.latitude) {
                try {
                    // Fallback 3: OSM Nominatim (Full Address)
                    const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=in`, {
                        headers: { 'User-Agent': 'SakhiCustomerApp/1.0' }
                    });
                    const osmData = await osmRes.json();
                    if (osmData && osmData.length > 0) {
                        coords = { latitude: parseFloat(osmData[0].lat), longitude: parseFloat(osmData[0].lon) };
                    }
                } catch (e) { }
            }

            if (!coords || !coords.latitude) {
                try {
                    // Fallback 4: Photon Komoot API
                    const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(fullAddress)}&limit=1`);
                    const photonData = await photonRes.json();
                    if (photonData?.features?.length > 0) {
                        const [lon, lat] = photonData.features[0].geometry.coordinates;
                        coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
                    }
                } catch (e) { }
            }

            if (!coords || !coords.latitude) {
                CustomAlert.alert('Location Error', 'Could not precisely locate this address. Please try searching with a different term.');
                return;
            }

            if (activeInput === 'pickup') {
                setPickup({ ...coords, address: newAddress });
                setPickupQuery(newAddress);
                setActiveInput('dropoff');
                setResults([]);
            } else if (activeInput === 'stop') {
                // Block stops outside Bengaluru — show back so user can fix it
                if (!isInBengaluru(coords.latitude, coords.longitude)) {
                    router.push({ pathname: '/bengaluru-only', params: { allowBack: 'true' } });
                    return;
                }
                setStop?.({ ...coords, address: newAddress });
                setStopQuery(newAddress);
                setActiveInput('dropoff');
                setResults([]);
            } else {
                // Block drop-offs outside Bengaluru — show back so user can fix it
                if (!isInBengaluru(coords.latitude, coords.longitude)) {
                    router.push({ pathname: '/bengaluru-only', params: { allowBack: 'true' } });
                    return;
                }
                setDropoff({ ...coords, address: newAddress });
                router.replace(returnRoute);
            }
        } catch (error) {
            console.error('Location Search Error:', error);
            Keyboard.dismiss();
            Alert.alert('Location Error', 'An error occurred while selecting this location. Please try again.');
        } finally {
            setResolving(false);
        }
    };

    const handleConfirm = () => {
        if (!ride?.pickup?.latitude || pickupQuery !== ride.pickup.address) {
            Alert.alert('Missing Location', 'Please select a pickup location from the suggestions or map.');
            return;
        }
        if (!ride?.dropoff?.latitude || dropoffQuery !== ride.dropoff.address) {
            Alert.alert('Missing Location', 'Please select a drop-off location from the suggestions or map.');
            return;
        }
        if (showStop && (!ride?.stop?.latitude || stopQuery !== ride.stop.address)) {
            Alert.alert('Missing Location', 'Please select a stop location from the suggestions, or remove the stop.');
            return;
        }
        router.replace(returnRoute);
    };

    const handleSwap = () => {
        const tempRide = ride.pickup;
        const tempQuery = pickupQuery;

        if (ride.dropoff || tempRide) {
            setPickup(ride.dropoff || null);
            setDropoff(tempRide || null);

            setPickupQuery(dropoffQuery);
            setDropoffQuery(tempQuery);
        }
    };

    const handleSelectSavedPlace = (place) => {
        handleSelectPlace({
            place_id: place.id || place.place_id || String(Math.random()),
            eLoc: place.eLoc || null,
            main: place.name || place.label || 'Saved Place',
            secondary: place.address || '',
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: headerPaddingTop, height: headerHeight }]}>
                <Pressable onPress={() => {
                    if (mapMode) { setMapMode(false); return; }
                    router.canGoBack() ? router.back() : router.replace('/');
                }} style={styles.backBtn}>
                    <Feather name="arrow-left" size={18} color="#BEA3D8" />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {mapMode ? `Set ${activeInput === 'pickup' ? 'Pickup' : activeInput === 'stop' ? 'Stop' : 'Drop-off'} on Map` : 'Plan Your Ride'}
                </Text>
                {/* Pin on Map toggle */}
                <TouchableOpacity
                    style={[styles.mapModeBtn, mapMode && styles.mapModeBtnActive]}
                    onPress={() => {
                        setMapMode(!mapMode);
                        if (!mapMode) {
                            // seed current location as initial center
                            const seedLat = ride?.pickup?.latitude;
                            const seedLng = ride?.pickup?.longitude;
                            if (seedLat && seedLng) {
                                setDragCoords({ latitude: seedLat, longitude: seedLng });
                                reverseGeocode(seedLat, seedLng);
                            }
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <Feather name="map-pin" size={16} color={mapMode ? '#fff' : '#7C3AED'} />
                    <Text style={[styles.mapModeBtnText, mapMode && styles.mapModeBtnTextActive]}>
                        {mapMode ? 'Search' : 'Pin on Map'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── MAP DRAG MODE ────────────────────────────────────────────── */}
            {mapMode && (
                <View style={styles.mapContainer}>
                    <MapplsMapWebView
                        style={styles.dragMap}
                        center={dragCoords ? { latitude: dragCoords.latitude, longitude: dragCoords.longitude } : (ride?.pickup ? { latitude: ride.pickup.latitude, longitude: ride.pickup.longitude } : undefined)}
                        zoom={16}
                        markers={[]}
                        dragMode
                        onDragEnd={handleMapDragEnd}
                    />

                    {/* Static crosshair / center pin */}
                    <View style={styles.crosshairContainer} pointerEvents="none">
                        <Animated.View style={[styles.crosshairPin, { transform: [{ translateY: pinBounce }] }]}>
                            <Feather name="map-pin" size={36} color="#7C3AED" />
                        </Animated.View>
                        <View style={styles.crosshairShadow} />
                        {/* Horizontal line */}
                        <View style={[styles.crosshairLine, { width: 24, height: 1.5 }]} />
                        {/* Vertical line */}
                        <View style={[styles.crosshairLine, { width: 1.5, height: 24, position: 'absolute' }]} />
                    </View>

                    {/* Address pill at top */}
                    <View style={[styles.addressPill, { top: 16 }]}>
                        {geoLoading ? (
                            <ActivityIndicator size="small" color="#7C3AED" />
                        ) : (
                            <Feather name="map-pin" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.addressPillText} numberOfLines={2}>
                            {geoLoading ? 'Finding address…' : (dragAddress || 'Drag map to set location')}
                        </Text>
                    </View>

                    {/* Confirm button */}
                    <View style={[styles.mapFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <TouchableOpacity
                            style={[styles.mapConfirmBtn, !dragCoords && styles.mapConfirmBtnDisabled]}
                            onPress={handleMapConfirm}
                            disabled={!dragCoords}
                            activeOpacity={0.88}
                        >
                            <Feather name="check" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.mapConfirmText}>
                                Set {activeInput === 'pickup' ? 'Pickup' : activeInput === 'stop' ? 'Stop' : 'Drop-off'} Here
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── SEARCH MODE ─────────────────────────────────────────────── */}
            {!mapMode && (<>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Search Card */}
                    <View style={styles.searchCardWrapper}>
                        <View style={styles.searchCard}>
                            <View style={styles.routeRow}>
                                {/* Icon Column */}
                                <View style={styles.iconColumn}>
                                    <View style={styles.dotGreen} />
                                    <View style={styles.dashedLine} />
                                    {showStop && <View style={styles.dotVia} />}
                                    {showStop && <View style={styles.dashedLine} />}
                                    <Svg width="14" height="17" viewBox="0 0 14 17" fill="none">
                                        <Path d="M6.66667 8.33333C7.125 8.33333 7.51736 8.17014 7.84375 7.84375C8.17014 7.51736 8.33333 7.125 8.33333 6.66667C8.33333 6.20833 8.17014 5.81597 7.84375 5.48958C7.51736 5.16319 7.125 5 6.66667 5C6.20833 5 5.81597 5.16319 5.48958 5.48958C5.16319 5.81597 5 6.20833 5 6.66667C5 7.125 5.16319 7.51736 5.48958 7.84375C5.81597 8.17014 6.20833 8.33333 6.66667 8.33333ZM6.66667 16.6667C4.43056 14.7639 2.76042 12.9965 1.65625 11.3646C0.552083 9.73264 0 8.22222 0 6.83333C0 4.75 0.670139 3.09028 2.01042 1.85417C3.35069 0.618055 4.90278 0 6.66667 0C8.43056 0 9.98264 0.618055 11.3229 1.85417C12.6632 3.09028 13.3333 4.75 13.3333 6.83333C13.3333 8.22222 12.7812 9.73264 11.6771 11.3646C10.5729 12.9965 8.90278 14.7639 6.66667 16.6667Z" fill="#BEA3D8" />
                                    </Svg>
                                </View>

                                {/* Input Column */}
                                <View style={styles.inputColumn}>
                                    {/* Pickup */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>PICKUP LOCATION</Text>
                                        <TextInput
                                            style={activeInput === 'pickup' ? styles.dropInputActive : styles.dropInput}
                                            placeholder="Current Location"
                                            placeholderTextColor="rgba(190, 163, 216, 0.6)"
                                            value={pickupQuery}
                                            onFocus={() => { setActiveInput('pickup'); setResults([]); }}
                                            onChangeText={(v) => handleSearch(v, 'pickup')}
                                            returnKeyType="search" autoCorrect={false}
                                            autoCapitalize="words"
                                        />
                                    </View>

                                    {/* Add Stop row */}
                                    <TouchableOpacity
                                        style={styles.addStopRow}
                                        onPress={() => {
                                            if (showStop) {
                                                setShowStop(false);
                                                setStopQuery('');
                                                setStop?.(null);
                                            } else {
                                                setShowStop(true);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                                            <Feather name={showStop ? "x" : "plus"} size={14} color="#7C3AED" />
                                        </View>
                                        <Text style={styles.addStopText}>{showStop ? 'Remove Stop' : 'Add Stop'}</Text>
                                    </TouchableOpacity>

                                    {/* Stop (via) input */}
                                    {showStop && (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>STOP / VIA</Text>
                                            <TextInput
                                                style={activeInput === 'stop' ? styles.dropInputActive : styles.dropInput}
                                                placeholder="Add a stop along the way"
                                                placeholderTextColor="rgba(190, 163, 216, 0.6)"
                                                value={stopQuery}
                                                onFocus={() => { setActiveInput('stop'); setResults([]); }}
                                                onChangeText={(v) => handleSearch(v, 'stop')}
                                                returnKeyType="search" autoCorrect={false}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                    )}

                                    {/* Drop-off */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>DROP-OFF LOCATION</Text>
                                        <TextInput
                                            style={activeInput === 'dropoff' ? styles.dropInputActive : styles.dropInput}
                                            placeholder="Where to?"
                                            placeholderTextColor="rgba(190, 163, 216, 0.6)"
                                            value={dropoffQuery}
                                            onFocus={() => { setActiveInput('dropoff'); setResults([]); }}
                                            onChangeText={(v) => handleSearch(v, 'dropoff')}
                                            returnKeyType="search"
                                            autoFocus={!stopQuery}
                                            autoCorrect={false}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Swap button */}
                                <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.8}>
                                    <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <Path d="M4.66667 14L4.66667 4.55333L2.61333 6.60667L1.66667 5.66667L5.33333 2L9 5.66667L8.05333 6.60667L6 4.55333L6 14L4.66667 14ZM10.6667 14L7 10.3333L7.94667 9.39333L10 11.4467V2H11.3333V11.4467L13.3867 9.39333L14.3333 10.3333L10.6667 14Z" fill="#BEA3D8" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>


                    {/* Saved Places */}
                    <View style={styles.savedSection}>
                        <Text style={styles.sectionTitle}>SAVED PLACES</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} keyboardShouldPersistTaps="handled">
                            {savedPlaces.map(place => (
                                <TouchableOpacity key={place.id} style={styles.chip} onPress={() => handleSelectSavedPlace(place)}>
                                    {place.label === 'home' ? (
                                        <Feather name="home" size={14} color="#10B981" />
                                    ) : place.label === 'work' ? (
                                        <Feather name="briefcase" size={14} color="#3B82F6" />
                                    ) : (
                                        <Feather name="map-pin" size={14} color="#A78BFA" />
                                    )}
                                    <Text style={styles.chipText}>
                                        {place.label.charAt(0).toUpperCase() + place.label.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.chip} onPress={() => router.push('/saved-places')}>
                                <Feather name="plus" size={14} color="#BEA3D8" />
                                <Text style={styles.chipText}>Add New</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Recent / Suggestions Section */}
                    <View style={styles.recentSection}>
                        <Text style={styles.sectionTitle}>
                            {isSearching ? 'SUGGESTIONS' : 'RECENT DESTINATIONS'}
                        </Text>

                        {/* Searching spinner */}
                        {searching && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#BEA3D8" />
                                <Text style={styles.loadingText}>Searching…</Text>
                            </View>
                        )}

                        {/* Resolving coordinates spinner */}
                        {resolving && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#7C3AED" />
                                <Text style={styles.loadingText}>Locating address…</Text>
                            </View>
                        )}

                        {/* Loading recent (skeleton state) */}
                        {!isSearching && loadingRecent && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#BEA3D8" />
                                <Text style={styles.loadingText}>Loading recent destinations…</Text>
                            </View>
                        )}

                        {/* No results */}
                        {isSearching && !searching && results.length === 0 && (
                            <View style={styles.emptyState}>
                                <Feather name="search" size={32} color="#94A3B8" style={{ marginBottom: 4 }} />
                                <Text style={styles.emptyText}>No results found for "{(activeInput === 'pickup' ? pickupQuery : dropoffQuery)}"</Text>
                                <Text style={styles.emptySubText}>Try a different search term</Text>
                            </View>
                        )}

                        {/* No recent destinations */}
                        {!isSearching && !loadingRecent && recentDestinations.length === 0 && (
                            <View style={styles.emptyState}>
                                <Feather name="map" size={32} color="#94A3B8" style={{ marginBottom: 4 }} />
                                <Text style={styles.emptyText}>No recent destinations yet</Text>
                                <Text style={styles.emptySubText}>Your past drop-offs will appear here</Text>
                            </View>
                        )}

                        {/* Results / Recent list */}
                        {(isSearching ? results : recentDestinations).map((item, index) => {
                            const displayList = isSearching ? results : recentDestinations;
                            return (
                                <React.Fragment key={item.place_id || index}>
                                    <Pressable
                                        style={styles.recentRow}
                                        onPress={() => handleSelectPlace(item)}
                                    >
                                        <View style={styles.recentIconBg}>
                                            {isSearching ? (
                                                <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                                    <Path d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 20C5.31667 17.7167 3.3125 15.6042 1.9875 13.6625C0.6625 11.7208 0 9.93333 0 8.3C0 5.8 0.804167 3.79167 2.4125 2.275C4.02083 0.758333 5.88333 0 8 0C10.1167 0 11.9792 0.758333 13.5875 2.275C15.1958 3.79167 16 5.8 16 8.3C16 9.93333 15.3375 11.7208 14.0125 13.6625C12.6875 15.6042 10.6833 17.7167 8 20Z" fill="#BEA3D8" />
                                                </Svg>
                                            ) : (
                                                <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <Path d="M13.3 14.7L14.7 13.3L11 9.6V5H9V10.4L13.3 14.7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z" fill="#94A3B8" />
                                                </Svg>
                                            )}
                                        </View>
                                        <View style={styles.recentInfo}>
                                            <Text style={styles.recentMain} numberOfLines={1}>
                                                {item.structured_formatting?.main_text || item.main}
                                            </Text>
                                            <Text style={styles.recentSub} numberOfLines={1}>
                                                {item.structured_formatting?.secondary_text || item.secondary}
                                            </Text>
                                        </View>
                                        <Feather name="arrow-right" size={16} color="#BEA3D8" />
                                    </Pressable>
                                    {index < displayList.length - 1 && (
                                        <View style={styles.divider} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={handleConfirm}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.ctaText}>CONFIRM LOCATIONS</Text>
                    </TouchableOpacity>
                </View>
            </>)}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 64,
        backgroundColor: '#F5F0FF',
        zIndex: 10
    },
    // Map pin toggle button in header
    mapModeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#EDE9FE',
        gap: 5,
        marginLeft: 'auto',
    },
    mapModeBtnActive: {
        backgroundColor: '#7C3AED',
    },
    mapModeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7C3AED',
    },
    mapModeBtnTextActive: {
        color: '#fff',
    },
    // Map drag mode
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    dragMap: {
        flex: 1,
    },
    crosshairContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    crosshairPin: {
        marginBottom: -4, // pin tip lands at center
    },
    crosshairShadow: {
        width: 12,
        height: 5,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginTop: -2,
    },
    crosshairLine: {
        backgroundColor: 'rgba(124, 58, 237, 0.4)',
        borderRadius: 1,
    },
    addressPill: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 10,
    },
    addressPillText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 18,
    },
    mapFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'transparent',
    },
    mapConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    mapConfirmBtnDisabled: {
        backgroundColor: '#C4B5FD',
        shadowOpacity: 0,
        elevation: 0,
    },
    mapConfirmText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    iconBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: 'bold'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
        marginLeft: 16
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Header

    backBtn: {
        width: 19,
        height: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 18,
        color: '#BEA3D8',
        fontWeight: '600',
    },


    scrollContent: {
        paddingBottom: 0,
    },

    // Search card
    searchCardWrapper: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    searchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    routeRow: {
        flexDirection: 'row',
        gap: 16,
    },

    // Icon column
    iconColumn: {
        alignItems: 'center',
        paddingTop: 11, // Pushes dot to the exact gap between "PICKUP LOCATION" and the input
        paddingBottom: 10, // Pushes pin to the exact gap between "DROP-OFF LOCATION" and the input
        width: 16,
        alignSelf: 'stretch',
        justifyContent: 'space-between',
    },
    dotGreen: {
        width: 14,
        height: 14,
        borderRadius: 9999,
        backgroundColor: '#10B981',
    },
    dashedLine: {
        position: 'absolute',
        top: 32,
        bottom: 34,
        width: 0,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#CCC3D8',
    },
    dotVia: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F59E0B',
        borderWidth: 2,
        borderColor: '#FDE68A',
    },
    dropPin: {
        fontSize: 14,
        color: '#BEA3D8',
    },
    // Add stop button
    addStopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    addStopIcon: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#EDE9FE',
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
        fontWeight: '700',
        color: '#7C3AED',
        overflow: 'hidden',
    },
    addStopText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7C3AED',
    },

    // Input column
    inputColumn: {
        flex: 1,
        gap: 20,
        paddingRight: 40, // Avoid overlapping the absolute swap button
    },
    inputGroup: {
        gap: 4,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.55,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    inputValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1E1B2E',
        lineHeight: 24,
    },
    dropInput: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1E1B2E',
        lineHeight: 18,
        padding: 0,
    },
    dropInputActive: {
        fontSize: 15,
        fontWeight: '500',
        color: '#7C3AED',
        lineHeight: 18,
        padding: 0,
    },

    // Swap button
    swapBtn: {
        position: 'absolute',
        right: 0,
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    swapIcon: {
        fontSize: 16,
        color: '#BEA3D8',
    },

    // Saved section
    savedSection: {
        paddingHorizontal: 20,
        paddingTop: 31,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        lineHeight: 20,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(204, 195, 216, 0.1)',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipIcon: {
        fontSize: 14,
        color: '#BEA3D8',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 21,
    },

    // Recent searches
    recentSection: {
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 8,
        gap: 16,
        borderRadius: 12,
    },
    recentIconBg: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentIcon: {
        fontSize: 16,
        color: '#94A3B8',
    },
    recentInfo: {
        flex: 1,
    },
    recentMain: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E1B2E',
        lineHeight: 22,
    },
    recentSub: {
        fontSize: 13,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
    },
    recentArrow: {
        fontSize: 16,
        color: '#BEA3D8',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: 'rgba(204, 195, 216, 0.3)',
    },

    // Loading
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    emptyIcon: {
        fontSize: 32,
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 13,
        fontWeight: '400',
        color: '#94A3B8',
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
    },
    ctaButton: {
        height: 56,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 6,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        lineHeight: 24,
    },
});