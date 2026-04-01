import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, Image, Platform, Alert, Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function RideDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Mock data for display based on design spec
    const ride = {
        date: "Monday, 15 Mar 2026, 08:30 AM",
        duration: "14 mins",
        distance: "3.2 km",
        pickup: "12, Green Park Avenue, New Delhi",
        dropoff: "Hauz Khas Social, New Delhi",
        fare: {
            base: 30,
            dist: 55,
            wait: 2,
            total: 87
        },
        paymentMethod: "Cash",
        driver: {
            name: "Meena R.",
            vehicle: "Auto · KA 05 AB 1234",
            rating: "4.8"
        },
        userReview: {
            rating: 5,
            comment: "\"Very safe and comfortable ride.\""
        },
        isSubscription: false // Set to true to see the SUB badge
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ride Details</Text>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => Alert.alert('Share Ride', `Trip ID: SAKHI-${Date.now().toString().slice(-6)}\nShare link: sakhi.app/trip/demo`, [{ text: 'Copy Link', onPress: () => Alert.alert('Copied!', 'Link copied to clipboard.') }, { text: 'Close' }])}>
                        <Text style={styles.headerIcon}>🔗</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
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
                                    <Text style={styles.fareValue}>₹{ride.fare.base}</Text>
                                </View>
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Distance ({ride.distance})</Text>
                                    <Text style={styles.fareValue}>₹{ride.fare.dist}</Text>
                                </View>
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Waiting</Text>
                                    <Text style={styles.fareValue}>₹{ride.fare.wait}</Text>
                                </View>
                                
                                <View style={styles.fareDivider} />
                                
                                <View style={styles.fareTotalRow}>
                                    <Text style={styles.fareTotalLabel}>Total</Text>
                                    <Text style={styles.fareTotalValue}>₹{ride.fare.total}</Text>
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
                                        {/* Placeholder for driver image */}
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
                                <Text style={styles.reviewComment}>{ride.userReview.comment}</Text>
                            </View>
                            
                        </View>
                    </View>

                </ScrollView>

                {/* Fixed Bottom Action */}
                <View style={styles.bottomFixedWrap}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => router.push('/location-search')}>
                        <Text style={styles.actionBtnText}>Book Same Route</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    /* Header AppBar */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        zIndex: 10,
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { fontSize: 22, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },

    scrollContent: {
        paddingBottom: 140, // Avoid bottom button overlap
    },

    /* Map Area Placeholder */
    mapSection: {
        width: '100%', height: 236,
        backgroundColor: '#EBE6F5', // Soft map placeholder bg
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
        backgroundColor: '#EBE6F5',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 9999,
    },
    metaBadgeText: { fontSize: 12, fontWeight: '500', color: '#4A4455' },
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
    routeAddressText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1A25', lineHeight: 18 },
    routeVertLineWrap: { paddingLeft: 6, marginVertical: 2 },
    routeVertLine: { width: 2, height: 24, backgroundColor: '#BEA3D8', opacity: 0.3 },
    pinPurpleWrap: { width: 14, alignItems: 'center' },
    pinPurple: { fontSize: 14, color: '#BEA3D8' },

    /* Fare Box */
    fareBox: {
        backgroundColor: '#F6F1FF',
        borderRadius: 8,
        padding: 16, paddingTop: 24,
        gap: 12,
    },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareLabel: { fontSize: 14, color: '#4A4455' },
    fareValue: { fontSize: 14, color: '#4A4455' },
    fareDivider: { height: 1, backgroundColor: 'rgba(204, 195, 216, 0.3)', marginVertical: 4 },
    fareTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
    fareTotalValue: { fontSize: 20, fontWeight: '700', color: '#BEA3D8' },
    paymentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    paymentMetaIcon: { fontSize: 12 },
    paymentMetaText: { fontSize: 12, color: '#1C1A25' },

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
    driverName: { fontSize: 16, fontWeight: '700', color: '#1C1A25' },
    driverVehicle: { fontSize: 12, color: '#1C1A25' },
    driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    driverRatingText: { fontSize: 16, fontWeight: '700', color: '#F59E0B' },
    starIcon: { fontSize: 14, color: '#F59E0B' },

    /* User Review Area */
    reviewSection: { 
        borderTopWidth: 1, borderTopColor: 'rgba(204, 195, 216, 0.2)',
        paddingTop: 16, gap: 4 
    },
    reviewScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reviewLabel: { fontSize: 12, fontWeight: '500', color: '#4A4455' },
    starsWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    reviewComment: { fontSize: 12, color: '#1C1A25', fontStyle: 'italic', marginTop: 4 },

    /* Fixed Bottom Action */
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 108, padding: 24,
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
