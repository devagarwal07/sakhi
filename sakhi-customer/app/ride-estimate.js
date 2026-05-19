import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import { useRouter } from 'expo-router';
import SmartMapView from '../src/components/SmartMapView';
import { calculateFare, parseKmText, PRICING, isNightFare, NIGHT_FARE_MULTIPLIER } from '../src/utils/fareCalculator';
import { isWithinBengaluru } from '../src/utils/constants';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import { estimateFare } from '../src/api/endpoints';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const MAPPLS_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';

async function fetchDirectionsPolyline(origin, destination, waypoint) {
    // Mappls Route Advanced API — same encoded polyline format as Google
    // Docs: https://github.com/mappls-api/mappls-rest-apis/blob/main/docs/custom/route-adv-api.md
    const start = `${origin.longitude},${origin.latitude}`;
    const dest  = `${destination.longitude},${destination.latitude}`;
    const via   = waypoint ? `&viaPoints=${waypoint.longitude},${waypoint.latitude}` : '';
    const url   = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/route_adv/driving/${start};${dest}?geometries=polyline&overview=full${via}`;
    const res  = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (route) {
        const points   = decodePolylineAdaptive(route.geometry, origin, destination);
        const distM    = route.legs?.reduce((s, l) => s + (l.distance || 0), 0) ?? 0;
        const durS     = route.legs?.reduce((s, l) => s + (l.duration || 0), 0) ?? 0;
        const distance = `${(distM / 1000).toFixed(1)} km`;
        const duration = `${Math.round(durS / 60)} mins`;
        return { points, distance, duration };
    }
    return { points: [], distance: null, duration: null };
}

// Decode encoded polyline (compatible with both Google & Mappls formats)
function decodePolyline(encoded, precision = 5) {
    const poly = [];
    let index = 0, lat = 0, lng = 0;
    const factor = Math.pow(10, precision);
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;
        shift = 0; result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;
        poly.push({ latitude: lat / factor, longitude: lng / factor });
    }
    return poly;
}

function decodePolylineAdaptive(encoded, origin, destination) {
    const p5 = decodePolyline(encoded, 5);
    const p6 = decodePolyline(encoded, 6);

    const isValid = (points) =>
        points.length > 1 &&
        points.every((p) => Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180);

    if (isValid(p5) && !isValid(p6)) return p5;
    if (isValid(p6) && !isValid(p5)) return p6;

    const score = (points) => {
        if (!origin || !points.length) return Number.POSITIVE_INFINITY;
        const head = points[0];
        const tail = points[points.length - 1];
        const end = destination || origin;
        return Math.abs(head.latitude - origin.latitude) +
            Math.abs(head.longitude - origin.longitude) +
            Math.abs(tail.latitude - end.latitude) +
            Math.abs(tail.longitude - end.longitude);
    };

    return score(p5) <= score(p6) ? p5 : p6;
}


const { width } = Dimensions.get('window');

export default function RideEstimateScreen() {
    const router = useRouter();
    const { ride, setFare, setPaymentMethod } = useRide();
    const insets = useSafeAreaInsets();
    const [breakdownExpanded, setBreakdownExpanded] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState('cash');
    const [modal, setModal] = useState(null);
    const [routePolyline, setRoutePolyline] = useState([]);
    const [routeDistance, setRouteDistance] = useState(null);
    const [routeDuration, setRouteDuration] = useState(null);
    const [fareData, setFareData] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(true);

    const pickup  = ride?.pickup;
    const dropoff = ride?.dropoff;
    const stop    = ride?.stop;   // optional via/stop point

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 8 : 12);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 80 : 56);
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? -8 : 8);

    const footerPaddingBottom = Math.max(
        insets.bottom + (Platform.OS === 'ios' ? 6 : 8),
        24
    );
    const footerHeightEstimate = 24 + footerPaddingBottom + 64;
    const scrollBottomPadding = footerHeightEstimate + 12;

    useEffect(() => {
        let active = true;
        (async () => {
            if (!pickup || !dropoff) {
                if (active) setLoadingRoute(false);
                return;
            }
            try {
                setLoadingRoute(true);
                const [dir, estReq] = await Promise.all([
                    fetchDirectionsPolyline(pickup, dropoff, stop).catch(err => {
                        console.error('Polyline error:', err);
                        return { points: [], distance: null, duration: null };
                    }),
                    estimateFare(pickup, dropoff, stop).catch(err => {
                        console.error('Estimate fare error:', err);
                        return null;
                    })
                ]);
                
                if (!active) return;
                
                const fallbackPoints = [pickup, stop, dropoff]
                    .filter(Boolean)
                    .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

                setRoutePolyline((dir.points && dir.points.length > 1) ? dir.points : fallbackPoints);
                if (dir.distance) setRouteDistance(dir.distance);
                if (dir.duration) setRouteDuration(dir.duration);
                if (estReq?.data) setFareData(estReq.data);
            } catch (err) {
                console.error('Estimate route/fare error:', err);
            } finally {
                if (active) setLoadingRoute(false);
            }
        })();
        return () => { active = false; };
    }, [pickup, dropoff, stop]);

    // Compute midpoint for initial map region
    const midLat = pickup && dropoff
        ? (pickup.latitude + dropoff.latitude) / 2
        : (pickup?.latitude || 19.0760);
    const midLng = pickup && dropoff
        ? (pickup.longitude + dropoff.longitude) / 2
        : (pickup?.longitude || 72.8777);
    const latDelta = pickup && dropoff
        ? Math.abs(pickup.latitude - dropoff.latitude) * 1.8 + 0.01
        : 0.04;
    const lngDelta = pickup && dropoff
        ? Math.abs(pickup.longitude - dropoff.longitude) * 1.8 + 0.01
        : 0.04;

    // Derived fare values — prefer API data, fall back to local calculator
    const distKm        = parseKmText(routeDistance);
    const localFare     = distKm > 0 ? calculateFare(distKm) : null;
    const fareResult    = fareData || (localFare ? {
        total:            localFare.estimated_fare,
        base_fare:        localFare.base_fare,
        billable_km:      localFare.billable_km,
        distance_charge:  localFare.distance_charge,
        pickup_surcharge: localFare.pickup_surcharge,
        waiting_charge:   0,
    } : null);

    const displayFare     = fareResult
        ? (fareData?.free_ride ? '₹0' : `₹${Math.round((fareResult.estimated_fare ?? fareResult.total ?? 0) * (isNightFare() ? NIGHT_FARE_MULTIPLIER : 1))}`)
        : '—';
    const isFreeRide      = !!fareData?.free_ride;
    const nightFare       = isNightFare();
    const baseTotal       = fareResult ? (fareResult.estimated_fare ?? fareResult.total ?? 0) : 0;
    const nightTotal      = nightFare ? Math.round(baseTotal * NIGHT_FARE_MULTIPLIER) : baseTotal;
    const originalFare    = fareResult ? `₹${baseTotal}` : null;
    const displayTime     = routeDuration || '—';
    const displayDistance = routeDistance || '—';

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.navIconBtn}>
                    <Feather name="arrow-left" size={24} color="#BEA3D8" />
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
                    <Feather name="more-vertical" size={24} color="#BEA3D8" style={{ marginTop: -2 }} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: scrollTopPadding, paddingBottom: scrollBottomPadding },
                ]}
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
                                {ride?.pickup?.address || 'Detecting your location…'}
                            </Text>
                            <Text style={styles.dropoffText} numberOfLines={1}>
                                {ride?.dropoff?.address || 'No destination selected'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/location-search')}>
                            <Feather name="edit-2" size={16} color="#BEA3D8" style={{ marginTop: Platform.OS === 'ios' ? -2 : 0 }} />
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Map Section */}
                <View style={styles.mapArea}>
                    {loadingRoute && (
                        <View style={[StyleSheet.absoluteFill, styles.mapLoadingOverlay]}>
                            <ActivityIndicator size="large" color="#BEA3D8" />
                        </View>
                    )}
                    <SmartMapView
                        style={StyleSheet.absoluteFill}
                        center={{ latitude: midLat, longitude: midLng }}
                        latDelta={latDelta}
                        lngDelta={lngDelta}
                        markers={[
                            pickup  && { id: 'pickup',  latitude: pickup.latitude,  longitude: pickup.longitude,  color: '#10B981', label: 'P' },
                            dropoff && { id: 'dropoff', latitude: dropoff.latitude, longitude: dropoff.longitude, color: '#BEA3D8', label: 'D' },
                        ].filter(Boolean)}
                        polylines={routePolyline.length > 1 ? [{ coords: routePolyline, color: '#BEA3D8', width: 5 }] : []}
                        scrollEnabled
                        zoomEnabled
                    />
                </View>

                {/* Main Content Area */}
                <View style={styles.bottomContent}>
                    
                    {/* Free Ride Banner */}
                {isFreeRide && (
                    <View style={styles.freeRideBanner}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Feather name="gift" size={16} color="#065F46" />
                            <Text style={[styles.freeRideBannerTitle, { marginBottom: 0 }]}>Your next ride is FREE!</Text>
                        </View>
                        <Text style={styles.freeRideBannerSub}>You had 3 consecutive failed bookings — enjoy a complimentary ride.</Text>
                    </View>
                )}

                {/* Night Fare Banner */}
                {isNightFare() && (
                    <View style={styles.nightFareBanner}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="moon" size={14} color="#FCD34D" />
                            <Text style={[styles.nightFareBannerText, { flex: 1 }]}>Night Fare Active (1.5×) — Applies between 10 PM and 6 AM</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionHeader}>AUTO RIDE</Text>

                    {/* Ride Selection Card */}
                    <View style={styles.rideCard}>
                        {/* Checkmark Badge */}
                        <View style={styles.checkBadge}>
                            <Feather name="check" size={12} color="#FFFFFF" />
                        </View>

                        <View style={styles.rideIllustration}>
                            <MaterialCommunityIcons name="rickshaw" size={32} color="#BEA3D8" />
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
                            <Text style={[styles.priceText, isFreeRide && styles.priceTextFree]}>{displayFare}</Text>
                            {isFreeRide && originalFare && (
                                <Text style={styles.priceStricken}>{originalFare}</Text>
                            )}
                            <Text style={styles.timeText}>{displayTime}</Text>
                        </View>
                    </View>

                    {/* Fare Breakdown Header */}
                    <TouchableOpacity 
                        style={styles.breakdownHeaderRow}
                        onPress={() => setBreakdownExpanded(!breakdownExpanded)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.breakdownTitle}>Fare Breakdown</Text>
                        <Feather name={breakdownExpanded ? "chevron-down" : "chevron-right"} size={20} color="#64748B" style={{ marginTop: -2 }} />
                    </TouchableOpacity>

                    {/* Fare Breakdown Card */}
                    {breakdownExpanded && (
                        <View style={styles.breakdownCard}>
                            {/* Sakhi Premium badge */}
                            <View style={styles.premiumBadge}>
                                <Text style={styles.premiumBadgeText}>✦ Sakhi Premium Included — Female Driver Guaranteed</Text>
                            </View>

                            {!fareResult && !loadingRoute && (
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8}}>
                                    <Feather name="alert-circle" size={14} color="#94A3B8" />
                                    <Text style={[styles.fareUnavailableNote, { paddingVertical: 0 }]}>
                                        Fare estimate unavailable — will be confirmed after booking
                                    </Text>
                                </View>
                            )}

                            {loadingRoute && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Calculating fare…</Text>
                                    <ActivityIndicator size="small" color="#BEA3D8" />
                                </View>
                            )}

                            {fareResult && (
                                <>
                                    {/* Row 1: Base Fare */}
                                    <View style={styles.breakdownRow}>
                                        <View style={styles.breakdownLabelWrap}>
                                            <Text style={styles.breakdownLabel}>Base Fare (first {PRICING.BASE_KM} km)</Text>
                                            <Text style={styles.breakdownSubLabel}>Govt ₹{PRICING.BASE_FARE_COMPONENTS.govt_minimum} + Pickup ₹{PRICING.BASE_FARE_COMPONENTS.pickup_charge} + Sakhi ₹{PRICING.BASE_FARE_COMPONENTS.sakhi_premium}</Text>
                                        </View>
                                        <Text style={styles.breakdownValue}>₹{PRICING.BASE_FARE}</Text>
                                    </View>

                                    {/* Row 2: Distance Charge */}
                                    <View style={styles.breakdownRow}>
                                        <View style={styles.breakdownLabelWrap}>
                                            <Text style={styles.breakdownLabel}>Distance ({displayDistance})</Text>
                                            {(fareResult.billable_km ?? 0) > 0 ? (
                                                <Text style={styles.breakdownSubLabel}>{(fareResult.billable_km ?? 0).toFixed(1)} km × ₹{PRICING.PER_KM_RATE}/km</Text>
                                            ) : (
                                                <Text style={styles.breakdownSubLabel}>Within base 2 km — included</Text>
                                            )}
                                        </View>
                                        <Text style={styles.breakdownValue}>₹{fareResult.distance_charge ?? 0}</Text>
                                    </View>

                                    {/* Row 3: Pickup Surcharge (only shown if applicable) */}
                                    {(fareResult.pickup_surcharge ?? 0) > 0 && (
                                        <View style={styles.breakdownRow}>
                                            <View style={styles.breakdownLabelWrap}>
                                                <Text style={styles.breakdownLabel}>Pickup Surcharge</Text>
                                                <Text style={styles.breakdownSubLabel}>Driver {'>'} {PRICING.FREE_PICKUP_RADIUS_KM} km away · ₹{PRICING.PICKUP_SURCHARGE_PER_KM}/km, max ₹{PRICING.MAX_PICKUP_SURCHARGE}</Text>
                                            </View>
                                            <Text style={styles.breakdownValue}>₹{fareResult.pickup_surcharge}</Text>
                                        </View>
                                    )}

                                    {/* Row 4: Waiting */}
                                    <View style={styles.breakdownRow}>
                                        <View style={styles.breakdownLabelWrap}>
                                            <Text style={styles.breakdownLabel}>Waiting Charges</Text>
                                            <Text style={styles.breakdownSubLabel}>First 3 min free · ₹{PRICING.WAIT_CHARGE_PER_MIN}/min after</Text>
                                        </View>
                                        <Text style={styles.breakdownValue}>₹0 est.</Text>
                                    </View>

                                    {/* Row 5: Night Surcharge (only when applicable) */}
                                    {nightFare && (
                                        <View style={styles.breakdownRow}>
                                            <View style={styles.breakdownLabelWrap}>
                                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                                    <Feather name="moon" size={14} color="#1E1B2E" />
                                                    <Text style={styles.breakdownLabel}>Night Surcharge</Text>
                                                </View>
                                                <Text style={styles.breakdownSubLabel}>+50% applied between 10 PM – 6 AM</Text>
                                            </View>
                                            <Text style={[styles.breakdownValue, { color: '#F59E0B' }]}>
                                                +₹{Math.round(baseTotal * (NIGHT_FARE_MULTIPLIER - 1))}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Divider */}
                                    <View style={styles.breakdownDivider} />

                                    {/* Row 6: Total */}
                                    <View style={styles.breakdownRow}>
                                        <Text style={[styles.breakdownLabel, styles.breakdownTotalLabel]}>Estimated Total</Text>
                                        <Text style={[styles.breakdownValue, styles.breakdownTotalValue]}>
                                            ₹{nightTotal}
                                        </Text>
                                    </View>

                                    {/* Offers & Discounts info button */}
                                    <TouchableOpacity
                                        style={styles.offersRow}
                                        onPress={() => setModal({
                                            icon: '🎁',
                                            title: 'Offers & Discounts',
                                            message: '5% off up to ₹100 on your first 3 rides\n\n10% off up to ₹150 on 15-day subscription rides\n\n15% off up to ₹200 on 30-day subscription rides',
                                            buttons: [{ text: 'Got it', onPress: () => setModal(null) }],
                                        })}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                            <Feather name="gift" size={14} color="#BEA3D8" />
                                            <Text style={styles.offersRowText}>View Offers & Discounts</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}

                </View>

            </ScrollView>

            {/* Footer Action Button Wrapper (Sticky) */}
            <View style={[styles.footerSticky, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity 
                    style={[styles.bookButton, (!pickup || !dropoff) && { opacity: 0.5 }]}
                    onPress={() => {
                        if (!pickup || !dropoff) return;
                        if ((pickup && !isWithinBengaluru(pickup)) || (dropoff && !isWithinBengaluru(dropoff))) {
                            router.push('/bengaluru-only');
                            return;
                        }
                        if (fareData) {
                            setFare({
                                base:          fareData.base          ?? 0,
                                distance_fare: fareData.distance_fare ?? fareData.distance ?? 0,
                                waiting:       fareData.waiting       ?? 0,
                                total:         fareData.total         ?? fareData.max      ?? 0,
                            });
                        }
                        setPaymentMethod(selectedPayment);
                        router.push('/ride-finding');
                    }}
                    activeOpacity={0.88}
                >
                    <Text style={styles.bookText}>
                        <Text style={styles.actionBtnText}>Book {ride?.vehicleType || ride?.vehicle_type || 'Auto'}</Text> <Feather name="chevron-right" size={20} color="#FFFFFF" />
                    </Text>
                </TouchableOpacity>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#F1F5F9' }] },
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
        // Under top nav / above sticky footer
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
        paddingVertical: 6,
        width: 12,
        alignSelf: 'stretch',
    },
    solidDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#BEA3D8',
    },
    dotLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
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
        gap: 12,
        justifyContent: 'space-between',
        paddingVertical: 0,
    },
    pickupText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 20,
    },
    dropoffText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
        lineHeight: 20,
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4, // push slightly away from text
    },
    editBtnText: {
        fontSize: 16,
        // Emojis often have a weird baseline, moving it up 1px fixes visual centering
        marginTop: Platform.OS === 'ios' ? -2 : 0, 
    },

    // Map Area
    mapArea: {
        height: 236,
        width: '100%',
        overflow: 'hidden',
    },
    mapLoadingOverlay: {
        zIndex: 10,
        backgroundColor: 'rgba(245, 240, 255, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
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
        color: '#64748B',
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
        color: '#64748B',
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
    priceTextFree: { color: '#059669' },
    priceStricken: {
        fontSize: 12, fontWeight: '500', color: '#9CA3AF',
        textDecorationLine: 'line-through', marginTop: 2,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16A34A',
        marginTop: 2,
    },

    // Free Ride Banner
    freeRideBanner: {
        backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16,
        borderWidth: 1.5, borderColor: '#BBF7D0', marginBottom: 16,
        shadowColor: '#059669', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
    },
    freeRideBannerTitle: { fontSize: 16, fontWeight: '800', color: '#065F46', marginBottom: 4 },
    freeRideBannerSub:   { fontSize: 12, fontWeight: '400', color: '#047857', lineHeight: 20 },

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
        color: '#64748B',
    },
    breakdownChevron: {
        fontSize: 18,
        fontWeight: '700',
        color: '#64748B',
        marginTop: -4, // visual alignment
    },

    // Fare Breakdown Card
    breakdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 12,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
        marginBottom: 24,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    breakdownLabelWrap: {
        flex: 1,
        marginRight: 8,
        gap: 2,
    },
    breakdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
    },
    breakdownSubLabel: {
        fontSize: 11,
        fontWeight: '400',
        color: '#94A3B8',
        lineHeight: 16,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E1B2E',
        minWidth: 48,
        textAlign: 'right',
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: '#F0EBF8',
        marginVertical: 4,
    },
    breakdownTotalLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E1B2E',
    },
    breakdownTotalValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#BEA3D8',
    },
    premiumBadge: {
        backgroundColor: '#EDE9FE',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 4,
    },
    premiumBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7C3AED',
        lineHeight: 16,
    },
    fareUnavailableNote: {
        fontSize: 13,
        fontWeight: '400',
        color: '#94A3B8',
        textAlign: 'center',
        paddingVertical: 8,
        lineHeight: 20,
    },
    // Night Fare Banner
    nightFareBanner: {
        backgroundColor: '#1E1B2E',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
        marginHorizontal: 20,
    },
    nightFareBannerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FCD34D',
        lineHeight: 18,
    },
    // Offers & Discounts row
    offersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    offersRowText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#BEA3D8',
        textDecorationLine: 'underline',
    },
    // Footer
    footerSticky: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 24,
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
