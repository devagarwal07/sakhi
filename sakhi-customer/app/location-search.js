import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Pressable, Keyboard, Platform,
    ScrollView, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { getRideHistory } from '../src/api/endpoints';
import { Feather } from '@expo/vector-icons';

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
    `&client_secret=${process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET}`,
    { method: 'POST' }
  );
  const json = await res.json();
  _mapplsToken = json.access_token;
  _tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
  return _mapplsToken;
}


export default function LocationSearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { setDropoff, setPickup, setStop, ride } = useRide();
    const insets = useSafeAreaInsets();
    const [pickupQuery,  setPickupQuery]  = useState(ride?.pickup?.address || '');
    const [dropoffQuery, setDropoffQuery] = useState('');
    const [stopQuery,    setStopQuery]    = useState(ride?.stop?.address   || '');
    const [showStop,     setShowStop]     = useState(!!ride?.stop?.address);
    const [activeInput, setActiveInput]   = useState('dropoff');
    const [results,     setResults]       = useState([]);
    const [searching,   setSearching]     = useState(false);
    const [recentDestinations, setRecentDestinations] = useState([]);
    const [loadingRecent,      setLoadingRecent]      = useState(true);
    const searchTimer = useRef(null);

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
    }, []);

    const handleSearch = (text, type = activeInput) => {
        if (type === 'pickup')  setPickupQuery(text);
        if (type === 'dropoff') setDropoffQuery(text);
        if (type === 'stop')    setStopQuery(text);
        setActiveInput(type);

        clearTimeout(searchTimer.current);
        if (text.trim().length < 3) { setResults([]); return; }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const token = await getMapplsToken();
                const lat = ride?.pickup?.latitude;
                const lng = ride?.pickup?.longitude;
                const biasParam = (lat && lng) ? `&location=${lat},${lng}` : '';
                // Mappls Place Search / Autocomplete
                const response = await fetch(
                    `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(text)}&access_token=${token}&region=IND${biasParam}`
                );
                const data = await response.json();
                // Normalise to same shape our UI expects
                const raw = data?.suggestedLocations || [];
                setResults(raw.map(p => ({
                    place_id: p.eLoc,
                    structured_formatting: {
                        main_text:      p.placeName  || p.keywords || text,
                        secondary_text: p.placeAddress || p.addressTokens?.city || '',
                    },
                    _lat: p.latitude,
                    _lng: p.longitude,
                })));
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
                } catch(e) { console.error('Mappls Routing Hack Failed:', e); }
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
                } catch(e) {}
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
                } catch(e) {}
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
                } catch(e) {}
            }

            if (!coords || !coords.latitude) {
                Alert.alert('Location Error', 'Could not precisely locate this address. Please try searching with a different term.');
                return;
            }

            if (activeInput === 'pickup') {
                setPickup({ ...coords, address: newAddress });
                setPickupQuery(newAddress);
                setActiveInput('dropoff');
                setResults([]);
            } else if (activeInput === 'stop') {
                setStop?.({ ...coords, address: newAddress });
                setStopQuery(newAddress);
                setActiveInput('dropoff');
                setResults([]);
            } else {
                setDropoff({ ...coords, address: newAddress });
                router.replace(returnRoute);
            }
        } catch (error) {
            console.error('Location Search Error:', error);
            Keyboard.dismiss();
            Alert.alert('Location Error', 'An error occurred while selecting this location. Please try again.');
        }
    };

    const handleConfirm = () => {
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: headerPaddingTop, height: headerHeight }]}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Feather name="arrow-left" size={18} color="#BEA3D8" />
                </Pressable>
                <Text style={styles.headerTitle}>Plan Your Ride</Text>
            </View>

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
                                    <Path d="M6.66667 8.33333C7.125 8.33333 7.51736 8.17014 7.84375 7.84375C8.17014 7.51736 8.33333 7.125 8.33333 6.66667C8.33333 6.20833 8.17014 5.81597 7.84375 5.48958C7.51736 5.16319 7.125 5 6.66667 5C6.20833 5 5.81597 5.16319 5.48958 5.48958C5.16319 5.81597 5 6.20833 5 6.66667C5 7.125 5.16319 7.51736 5.48958 7.84375C5.81597 8.17014 6.20833 8.33333 6.66667 8.33333ZM6.66667 16.6667C4.43056 14.7639 2.76042 12.9965 1.65625 11.3646C0.552083 9.73264 0 8.22222 0 6.83333C0 4.75 0.670139 3.09028 2.01042 1.85417C3.35069 0.618055 4.90278 0 6.66667 0C8.43056 0 9.98264 0.618055 11.3229 1.85417C12.6632 3.09028 13.3333 4.75 13.3333 6.83333C13.3333 8.22222 12.7812 9.73264 11.6771 11.3646C10.5729 12.9965 8.90278 14.7639 6.66667 16.6667Z" fill="#BEA3D8"/>
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
                                    <Path d="M4.66667 14L4.66667 4.55333L2.61333 6.60667L1.66667 5.66667L5.33333 2L9 5.66667L8.05333 6.60667L6 4.55333L6 14L4.66667 14ZM10.6667 14L7 10.3333L7.94667 9.39333L10 11.4467V2H11.3333V11.4467L13.3867 9.39333L14.3333 10.3333L10.6667 14Z" fill="#BEA3D8"/>
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>


                {/* Saved Places */}
                <View style={styles.savedSection}>
                    <Text style={styles.sectionTitle}>SAVED PLACES</Text>
                    <View style={styles.chipsRow}>
                        <TouchableOpacity style={styles.chip} onPress={() => handleSearch('Home')}>
                            <Svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={styles.chipIcon}>
                                <Path d="M1.5 12H3.75V7.5H8.25V12H10.5V5.25L6 1.875L1.5 5.25V12ZM0 13.5V4.5L6 0L12 4.5V13.5H6.75V9H5.25V13.5H0Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={styles.chipText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => handleSearch('Work')}>
                            <Svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={styles.chipIcon}>
                                <Path d="M1.5 14.25C1.0875 14.25 0.734375 14.1031 0.440625 13.8094C0.146875 13.5156 0 13.1625 0 12.75V4.5C0 4.0875 0.146875 3.73438 0.440625 3.44062C0.734375 3.14687 1.0875 3 1.5 3H4.5V1.5C4.5 1.0875 4.64688 0.734375 4.94063 0.440625C5.23438 0.146875 5.5875 0 6 0H9C9.4125 0 9.76562 0.146875 10.0594 0.440625C10.3531 0.734375 10.5 1.0875 10.5 1.5V3H13.5C13.9125 3 14.2656 3.14687 14.5594 3.44062C14.8531 3.73438 15 4.0875 15 4.5V12.75C15 13.1625 14.8531 13.5156 14.5594 13.8094C14.2656 14.1031 13.9125 14.25 13.5 14.25H1.5ZM1.5 12.75H13.5V4.5H1.5V12.75ZM6 3H9V1.5H6V3ZM1.5 12.75V4.5V12.75Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={styles.chipText}>Work</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/saved-places')}>
                            <Text style={styles.chipIcon}>+</Text>
                            <Text style={styles.chipText}>Add New</Text>
                        </TouchableOpacity>
                    </View>
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
                                                <Path d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 20C5.31667 17.7167 3.3125 15.6042 1.9875 13.6625C0.6625 11.7208 0 9.93333 0 8.3C0 5.8 0.804167 3.79167 2.4125 2.275C4.02083 0.758333 5.88333 0 8 0C10.1167 0 11.9792 0.758333 13.5875 2.275C15.1958 3.79167 16 5.8 16 8.3C16 9.93333 15.3375 11.7208 14.0125 13.6625C12.6875 15.6042 10.6833 17.7167 8 20Z" fill="#BEA3D8"/>
                                            </Svg>
                                        ) : (
                                            <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <Path d="M13.3 14.7L14.7 13.3L11 9.6V5H9V10.4L13.3 14.7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z" fill="#94A3B8"/>
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
