import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { useAuth } from '../src/context/AuthContext';

import { submitRating } from '../src/api/endpoints';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

const { width } = Dimensions.get('window');

export default function RideSummaryScreen() {
    const router = useRouter();
    const { ride, clearRide } = useRide();
    const { user } = useAuth();
    const [rating, setRating] = useState(4); 
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 64 : 56);
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? 12 : 16);

    const tabBarPaddingBottom = Platform.OS === 'ios'
        ? Math.max(insets.bottom, 24)
        : insets.bottom;
    const tabBarHeight = (Platform.OS === 'ios' ? 76 : 87) + tabBarPaddingBottom;
    const bottomSpacerHeight = tabBarHeight + 20;

    // Real data from ride context
    const pickupAddress = ride?.pickup?.address || '—';
    const dropoffAddress = ride?.dropoff?.address || '—';
    const baseFare = ride?.fare?.base ?? '—';
    const distFare = ride?.fare?.distance_fare ?? ride?.fare?.distance ?? '—';
    const waitFare = ride?.fare?.waiting ?? 0;
    const distText = ride?.routeDistance || '';
    const total = ride?.fare?.total ?? (typeof baseFare === 'number' && typeof distFare === 'number' ? baseFare + distFare + waitFare : '—');
    const paymentMethod = ride?.paymentMethod || 'Cash';
    const driverFirstName = ride?.driver?.name ? ride.driver.name.split(' ')[0] : 'your driver';
    const userName = user?.name ? user.name.split(' ')[0] : 'there';

    const handleSubmit = async () => {
        setSubmitting(true);
        if (ride?.rideId) {
            try {
                // submitRating signature: (rideId, rating, comment)
                await submitRating(ride.rideId, rating, comment);
            } catch (_) {}
        }
        clearRide(); // Reset ride context so next booking starts clean
        setSubmitting(false);
        router.replace('/');
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation AppBar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.push('/')} style={styles.closeBtn}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Ride Summary</Text>
                </View>
                {/* Spacer to balance flex layout */}
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Success Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.successCircleWrapper}>
                        <View style={styles.successCircle}>
                            <Text style={styles.successCheck}>✓</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.headerTitle}>Ride Complete! <Text style={{ fontSize: 22 }}>🎉</Text></Text>
                    <Text style={styles.headerSub}>Hope you had a safe journey, {userName}</Text>
                </View>

                {/* Fare Summary Card */}
                <View style={styles.fareCard}>
                    {/* Route Timeline */}
                    <View style={styles.routeRow}>
                        <View style={styles.timelineCol}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dashedLine} />
                            <View style={styles.pinPurple}>
                                <View style={styles.pinHole} />
                            </View>
                        </View>
                        <View style={styles.routeTextCol}>
                            <View style={styles.addressBlock}>
                                <Text style={styles.addressLabel}>PICKUP</Text>
                                <Text style={styles.addressTitle} numberOfLines={2}>{pickupAddress}</Text>
                            </View>
                            <View style={styles.addressBlock}>
                                <Text style={styles.addressLabel}>DROP</Text>
                                <Text style={styles.addressTitle} numberOfLines={2}>{dropoffAddress}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.dividerLight} />

                    {/* Fare Breakdown */}
                    <View style={styles.breakdownBox}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Base Fare</Text>
                            <Text style={styles.breakdownValue}>{baseFare !== '—' ? `₹${baseFare}` : '—'}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Distance{distText ? ` (${distText})` : ''}</Text>
                            <Text style={styles.breakdownValue}>{distFare !== '—' ? `₹${distFare}` : '—'}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Waiting Charges</Text>
                            <Text style={styles.breakdownValue}>₹{waitFare}</Text>
                        </View>
                    </View>

                    <View style={styles.dividerBold} />

                    {/* Total Row */}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{total !== '—' ? `₹${total}` : '—'}</Text>
                    </View>

                    {/* Payment Mode */}
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentIcon}>💵</Text>
                        <Text style={styles.paymentText}>{paymentMethod} Payment</Text>
                    </View>
                </View>

                {/* Rating Section */}
                <View style={styles.ratingSection}>
                    <Text style={styles.ratingTitle}>Rate your driver {driverFirstName}</Text>
                    
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Text style={[styles.star, star <= rating ? styles.starFilled : styles.starEmpty]}>
                                    {star <= rating ? '★' : '☆'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.commentBox}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment (optional)"
                            placeholderTextColor="#6B7280"
                            multiline
                            textAlignVertical="top"
                            value={comment}
                            onChangeText={setComment}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.88}>
                        <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit & Done'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom spacer for mock tab bar */}
                <View style={{ height: bottomSpacerHeight }} />
            </ScrollView>

            {/* Dummy Tab Bar Overlay */}
            <View style={[styles.dummyTabBar, { height: tabBarHeight, paddingBottom: tabBarPaddingBottom }]}>
                <View style={styles.tabItemActive}>
                    <Text style={styles.tabIconActive}>🏠</Text>
                    <Text style={styles.tabLabelActive}>HOME</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>🚙</Text>
                    <Text style={styles.tabLabel}>ACTIVITY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>🛡️</Text>
                    <Text style={styles.tabLabel}>SAFETY</Text>
                </View>
                <View style={styles.tabItem}>
                    <Text style={styles.tabIcon}>👤</Text>
                    <Text style={styles.tabLabel}>PROFILE</Text>
                </View>
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
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    // Top Nav
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    closeBtn: {
        width: 40, height: 40, alignItems: 'center', justifyContent: 'center'
    },
    closeIcon: { fontSize: 20, color: '#BEA3D8', fontWeight: 'bold' },
    titleContainer: { flex: 1, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45 },

    // Main Content
    scrollContent: {
        paddingHorizontal: 24,
        alignItems: 'center',
    },

    // Header Section
    headerSection: { alignItems: 'center', width: '100%', marginBottom: 32 },
    successCircleWrapper: { marginBottom: 16 },
    successCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF',
        borderWidth: 4, borderColor: '#10B981',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    successCheck: { color: '#10B981', fontSize: 36, fontWeight: 'bold' },
    
    headerSub: { fontSize: 14, fontWeight: '400', color: '#6B7280', textAlign: 'center' },

    // Fare Summary Card
    fareCard: {
        width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
        paddingVertical: 24, paddingHorizontal: 24, marginBottom: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    
    routeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    timelineCol: { alignItems: 'center', paddingTop: 4, width: 12 },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', zIndex: 2 },
    dashedLine: { width: 1, height: 32, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', marginVertical: 4 },
    pinPurple: { 
        width: 12, height: 15, backgroundColor: '#BEA3D8', 
        borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        alignItems: 'center', paddingTop: 3
    },
    pinHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
    routeTextCol: { flex: 1, gap: 16 },
    addressBlock: { gap: 0 },
    addressLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' },
    addressTitle: { fontSize: 14, fontWeight: '600', color: '#1E1B2E', marginTop: 2 },

    dividerLight: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: -24, marginBottom: 24 }, // Extends to edges? CSS says left: 24, right: 24 within the card. Assuming it fills width. Let's make it 100%
    
    breakdownBox: { gap: 16, marginBottom: 24 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    breakdownLabel: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
    breakdownValue: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },

    dividerBold: { height: 2, backgroundColor: '#E2E8F0', marginHorizontal: -24, marginBottom: 16 },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    totalLabel: { fontSize: 18, fontWeight: '700', color: '#1E1B2E' },
    totalValue: { fontSize: 24, fontWeight: '800', color: '#BEA3D8' },

    paymentRow: { 
        flexDirection: 'row', alignItems: 'center', gap: 12, 
        backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 
    },
    paymentIcon: { fontSize: 16, color: '#6B7280' },
    paymentText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },

    // Rating Section
    ratingSection: { width: '100%', alignItems: 'center' },
    ratingTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B2E', marginBottom: 16 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    star: { fontSize: 36, lineHeight: 40 },
    starFilled: { color: '#FFB800' },
    starEmpty: { color: '#CBD5E1' },

    commentBox: { width: '100%', marginBottom: 32 },
    commentInput: {
        width: '100%', height: 96, backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
        padding: 16, fontSize: 14, color: '#1E1B2E'
    },

    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    // Dummy Tab Bar
    dummyTabBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 15,
    },
    tabItem: { alignItems: 'center', gap: 4 },
    tabItemActive: { alignItems: 'center', gap: 2, backgroundColor: '#F5F0FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
    tabIcon: { fontSize: 20, color: '#6B7280' },
    tabLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', letterSpacing: 1 },
    tabIconActive: { fontSize: 20, color: '#BEA3D8' },
    tabLabelActive: { fontSize: 10, fontWeight: '600', color: '#BEA3D8', letterSpacing: 1 },
});
