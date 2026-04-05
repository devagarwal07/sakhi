import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Image, Platform, Linking, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';
import { getRideById } from '../src/api/endpoints';

export default function RideDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [modal, setModal] = useState(null);
    const [rideData, setRideData] = useState(null);
    const [loading, setLoading] = useState(true);

    const footerPaddingBottom = Math.max(insets.bottom, 24);
    const scrollPaddingBottom = 24 + 60 + footerPaddingBottom + 24;

    useEffect(() => {
        const rideId = params?.rideId || params?.id;
        if (!rideId) { setLoading(false); return; }
        getRideById(rideId)
            .then(({ data }) => setRideData(data?.ride || data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Derive display values from API data
    const ride = rideData ? {
        date: rideData.created_at
            ? new Date(rideData.created_at).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—',
        duration: rideData.duration || '—',
        distance: rideData.distance || rideData.route_distance || '—',
        pickup: rideData.pickup_address || rideData.pickup?.address || '—',
        dropoff: rideData.dropoff_address || rideData.dropoff?.address || '—',
        fare: {
            base: rideData.fare?.base ?? '—',
            dist: rideData.fare?.distance_fare ?? rideData.fare?.distance ?? '—',
            wait: rideData.fare?.waiting ?? 0,
            total: rideData.fare?.total ?? '—',
        },
        paymentMethod: rideData.payment_method || 'Cash',
        driver: {
            name: rideData.driver?.name || '—',
            vehicle: rideData.driver?.vehicle
                ? `${rideData.driver.vehicle.type || 'Auto'} · ${rideData.driver.vehicle.plate || ''}`
                : '—',
            rating: rideData.driver?.rating?.toFixed(1) || '—',
        },
        userReview: {
            rating: rideData.rating || 0,
            comment: rideData.review ? `"${rideData.review}"` : '',
        },
        isSubscription: rideData.fare?.total === 0 || rideData.is_subscription || false,
    } : null;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                        <Text style={styles.headerTitle}>Ride Details</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setModal({
                        icon: '🔗',
                        title: 'Share Ride',
                        message: `Trip ID: SAKHI-${params?.rideId || Date.now().toString().slice(-6)}\nShare link: sakhi.app/trip/${params?.rideId || 'demo'}`,
                        buttons: [
                            { text: 'Copy Link', onPress: () => {
                                setModal({
                                    icon: '✅',
                                    title: 'Copied!',
                                    message: 'Link copied to clipboard.',
                                    buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                                });
                            }},
                            { text: 'Close', style: 'cancel', onPress: () => setModal(null) }
                        ]
                    })}>
                        <Text style={styles.headerIcon}>🔗</Text>
                    </TouchableOpacity>
                </View>

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color="#BEA3D8" />
                        <Text style={styles.loadingText}>Loading ride details…</Text>
                    </View>
                )}

                {/* No data state */}
                {!loading && !ride && (
                    <View style={styles.loadingState}>
                        <Text style={{ fontSize: 36 }}>🎫</Text>
                        <Text style={styles.loadingText}>Ride details not found.</Text>
                    </View>
                )}
                {/* Main Content Area - only show if ride data loaded */}
                {!loading && ride && (
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                >
                    
                    {/* Simulated Map Background Area */}
                    <View style={styles.mapSection}>
                        {/* A light placeholder for the map */}
                        <View style={styles.mapPlaceholder}>
                            <View style={styles.mapRouteLine}>
                                <View style={styles.mapStartDot} />
                                <View style={styles.mapEndPin} />
                            </View>
                        </View>
                    </View>

                    {/* Central Detail Card Cluster */}
                    <View style={styles.cardClusterWrap}>
                        <View style={styles.mainCard}>
                            
                            {/* Date & Meta */}
                            <View style={styles.cardHeader}>
                                <Text style={styles.dateText}>{ride.date}</Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaBadge}>
                                        <Text style={styles.metaBadgeText}>{ride.duration} · {ride.distance}</Text>
                                    </View>
                                </View>
                                {ride.isSubscription && (
                                    <View style={styles.subBadge}>
                                        <Text style={styles.subBadgeText}>SUB</Text>
                                    </View>
                                )}
                            </View>

                            {/* Route Visualizer */}
                            <View style={styles.routeSection}>
                                <View style={styles.routeRow}>
                                    <View style={styles.dotGreen} />
                                    <Text style={styles.routeAddressText}>{ride.pickup}</Text>
                                </View>
                                <View style={styles.routeVertLineWrap}>
                                    <View style={styles.routeVertLine} />
                                </View>
                                <View style={styles.routeRow}>
                                    <View style={styles.pinPurpleWrap}>
                                        <Text style={styles.pinPurple}>📍</Text>
                                    </View>
                                    <Text style={styles.routeAddressText}>{ride.dropoff}</Text>
                                </View>
                            </View>

                            {/* Fare Breakdown */}
                            <View style={styles.fareBox}>
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Base Fare</Text>
                                    <Text style={styles.fareValue}>{ride.fare.base !== '—' ? `₹${ride.fare.base}` : '—'}</Text>
                                </View>
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Distance ({ride.distance})</Text>
                                    <Text style={styles.fareValue}>{ride.fare.dist !== '—' ? `₹${ride.fare.dist}` : '—'}</Text>
                                </View>
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Waiting</Text>
                                    <Text style={styles.fareValue}>₹{ride.fare.wait}</Text>
                                </View>
                                
                                <View style={styles.fareDivider} />
                                
                                <View style={styles.fareTotalRow}>
                                    <Text style={styles.fareTotalLabel}>Total</Text>
                                    <Text style={styles.fareTotalValue}>{ride.fare.total !== '—' ? `₹${ride.fare.total}` : '—'}</Text>
                                </View>
                                
                                <View style={styles.paymentMetaRow}>
                                    <Text style={styles.paymentMetaIcon}>💵</Text>
                                    <Text style={styles.paymentMetaText}>Paid via {ride.paymentMethod}</Text>
                                </View>
                            </View>

                            {/* Driver Profile */}
                            <View style={styles.driverSection}>
                                <View style={styles.driverLeft}>
                                    <View style={styles.driverImgWrap}>
                                        <Text style={{fontSize: 24}}>👩🏽</Text>
                                    </View>
                                    <View style={styles.driverInfo}>
                                        <Text style={styles.driverName}>{ride.driver.name}</Text>
                                        <Text style={styles.driverVehicle}>{ride.driver.vehicle}</Text>
                                    </View>
                                </View>
                                <View style={styles.driverRatingRow}>
                                    <Text style={styles.driverRatingText}>{ride.driver.rating}</Text>
                                    <Text style={styles.starIcon}>★</Text>
                                </View>
                            </View>

                            {/* User Review / Rating given */}
                            {ride.userReview.rating > 0 && (
                            <View style={styles.reviewSection}>
                                <View style={styles.reviewScoreRow}>
                                    <Text style={styles.reviewLabel}>Your Rating:</Text>
                                    <View style={styles.starsWrap}>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Text key={i} style={[styles.starIcon, { fontSize: 14 }]}>
                                                {i < ride.userReview.rating ? '★' : '☆'}
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                                {!!ride.userReview.comment && (
                                    <Text style={styles.reviewComment}>{ride.userReview.comment}</Text>
                                )}
                            </View>
                            )}
                            
                        </View>
                    </View>

                </ScrollView>
                )}

                {/* Fixed Bottom Action */}
                <View style={[styles.bottomFixedWrap, { paddingBottom: footerPaddingBottom }]}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => router.push('/location-search')}>
                        <Text style={styles.actionBtnText}>Book Same Route</Text>
                    </TouchableOpacity>
                </View>

            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </SafeAreaView>
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
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 40,
    },
    loadingText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
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
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    /* Header AppBar */
    
    
    
    

    scrollContent: {
        paddingBottom: 0, // computed at runtime to avoid bottom button overlap
    },

    /* Map Area Placeholder */
    mapSection: {
        width: '100%', height: 236,
        backgroundColor: '#F1F5F9', // Soft map placeholder bg
        overflow: 'hidden',
    },
    mapPlaceholder: {
        flex: 1, opacity: 0.6,
        justifyContent: 'center', alignItems: 'center',
    },
    mapRouteLine: {
        width: 140, height: 80, 
        borderLeftWidth: 3, borderBottomWidth: 3, borderColor: '#AE74E6',
        borderRadius: 20,
        justifyContent: 'space-between'
    },
    mapStartDot: {
        width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF',
        position: 'absolute', top: -8, left: -9,
    },
    mapEndPin: {
        width: 16, height: 16, borderRadius: 8, backgroundColor: '#9641E7',
        position: 'absolute', bottom: -8, right: -8,
    },

    /* Card Cluster Overlay */
    cardClusterWrap: {
        marginTop: -40, // Overlap the map
        paddingHorizontal: 20,
    },
    mainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        paddingTop: 23,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
        gap: 24,
    },

    /* Date & Meta Section */
    cardHeader: { gap: 8 },
    dateText: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', lineHeight: 22 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 9999,
    },
    metaBadgeText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
    subBadge: {
        position: 'absolute', top: 0, right: 0,
        backgroundColor: '#EADDFF',
        paddingHorizontal: 10, paddingVertical: 2,
        borderRadius: 9999,
    },
    subBadgeText: { fontSize: 10, fontWeight: '700', color: '#25005A', letterSpacing: 0.5, textTransform: 'uppercase' },

    /* Route Visualizer */
    routeSection: { gap: 4 },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginLeft: 2 },
    routeAddressText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E1B2E', lineHeight: 18 },
    routeVertLineWrap: { paddingLeft: 6, marginVertical: 2 },
    routeVertLine: { width: 2, height: 24, backgroundColor: '#BEA3D8', opacity: 0.3 },
    pinPurpleWrap: { width: 14, alignItems: 'center' },
    pinPurple: { fontSize: 14, color: '#BEA3D8' },

    /* Fare Box */
    fareBox: {
        backgroundColor: '#F5F0FF',
        borderRadius: 8,
        padding: 16, paddingTop: 24,
        gap: 12,
    },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareLabel: { fontSize: 14, color: '#64748B' },
    fareValue: { fontSize: 14, color: '#64748B' },
    fareDivider: { height: 1, backgroundColor: 'rgba(204, 195, 216, 0.3)', marginVertical: 4 },
    fareTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
    fareTotalValue: { fontSize: 20, fontWeight: '700', color: '#BEA3D8' },
    paymentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    paymentMetaIcon: { fontSize: 12 },
    paymentMetaText: { fontSize: 12, color: '#1E1B2E' },

    /* Driver Profile */
    driverSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    driverLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    driverImgWrap: { 
        width: 48, height: 48, borderRadius: 24, 
        borderWidth: 2, borderColor: '#EADDFF', 
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F5F0FF'
    },
    driverInfo: { gap: 2 },
    driverName: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    driverVehicle: { fontSize: 12, color: '#1E1B2E' },
    driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    driverRatingText: { fontSize: 16, fontWeight: '700', color: '#F59E0B' },
    starIcon: { fontSize: 14, color: '#F59E0B' },

    /* User Review Area */
    reviewSection: { 
        borderTopWidth: 1, borderTopColor: 'rgba(204, 195, 216, 0.2)',
        paddingTop: 16, gap: 4 
    },
    reviewScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reviewLabel: { fontSize: 12, fontWeight: '500', color: '#64748B' },
    starsWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    reviewComment: { fontSize: 12, color: '#1E1B2E', fontStyle: 'italic', marginTop: 4 },

    /* Fixed Bottom Action */
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.9)',
    },
    actionBtn: {
        width: '100%', height: 60,
        borderWidth: 2, borderColor: '#BEA3D8', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    actionBtnText: {
        fontSize: 16, fontWeight: '700', color: '#BEA3D8',
    },
});
